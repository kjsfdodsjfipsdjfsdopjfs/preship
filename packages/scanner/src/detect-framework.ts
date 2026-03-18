import type { Page } from "puppeteer-core";

/**
 * Result of framework/tech stack detection.
 */
export interface FrameworkDetectionResult {
  /** Primary detected framework, or null if none identified */
  framework: string | null;
  /** Additional metadata from detection */
  meta: {
    generator?: string;
    poweredBy?: string;
  };
}

/**
 * Detect the frontend framework or tech stack used by a page.
 *
 * Checks for framework-specific globals, DOM attributes, meta tags,
 * and response headers to identify the technology powering the site.
 *
 * @param page - Puppeteer Page object (must already be navigated)
 * @param poweredByHeader - Optional value of the x-powered-by response header
 * @returns Detection result with framework name and metadata
 */
export async function detectFramework(
  page: Page,
  poweredByHeader?: string | null
): Promise<FrameworkDetectionResult> {
  const meta: FrameworkDetectionResult["meta"] = {};

  if (poweredByHeader) {
    meta.poweredBy = poweredByHeader;
  }

  // Run all detection checks in a single page.evaluate call for efficiency
  const detected = await page.evaluate(() => {
    const win = window as unknown as Record<string, unknown>;

    // Check framework-specific window globals (most specific first)
    if (win.__NEXT_DATA__) return "Next.js";
    if (win.__NUXT__ || win.__NUXT_DATA__) return "Nuxt";
    if (win.__remixContext) return "Remix";

    // Svelte
    if (
      win.__SVELTE__ ||
      document.querySelector('[class*="svelte-"]')
    ) {
      return "Svelte";
    }

    // Ember
    if (win.Ember) return "Ember";

    // Angular (modern and legacy)
    if (
      win.angular ||
      document.querySelector("[ng-version]") ||
      document.querySelector("[ng-app]")
    ) {
      return "Angular";
    }

    // React (check after Next.js/Remix which are React-based)
    if (
      document.querySelector("[data-reactroot]") ||
      document.getElementById("__next") ||
      (() => {
        // Check for _reactRootContainer on root elements
        const root =
          document.getElementById("root") ||
          document.getElementById("app");
        return root && (root as unknown as Record<string, unknown>)._reactRootContainer;
      })()
    ) {
      return "React";
    }

    // Vue (check after Nuxt which is Vue-based)
    if (
      document.querySelector("[data-v-]") ||
      document.querySelector("[data-v-app]") ||
      (() => {
        // Vue adds data-v-XXXX attributes to elements
        const allElements = document.querySelectorAll("*");
        for (const el of allElements) {
          for (const attr of el.getAttributeNames()) {
            if (attr.startsWith("data-v-")) return true;
          }
          // Only check first 50 elements for performance
          if (el === allElements[49]) break;
        }
        return false;
      })()
    ) {
      return "Vue";
    }

    // Check meta generator tag for SSGs and CMSes
    const generatorMeta = document.querySelector(
      'meta[name="generator"]'
    ) as HTMLMetaElement | null;
    if (generatorMeta?.content) {
      const gen = generatorMeta.content.toLowerCase();
      if (gen.includes("gatsby")) return "Gatsby";
      if (gen.includes("hugo")) return "Hugo";
      if (gen.includes("jekyll")) return "Jekyll";
      if (gen.includes("wordpress")) return "WordPress";
      if (gen.includes("drupal")) return "Drupal";
      if (gen.includes("astro")) return "Astro";
      if (gen.includes("eleventy") || gen.includes("11ty")) return "Eleventy";
      // Return the raw generator value if it doesn't match known frameworks
      return `generator:${generatorMeta.content}`;
    }

    return null;
  });

  // Extract generator meta separately for the meta field
  const generator = await page.evaluate(() => {
    const meta = document.querySelector(
      'meta[name="generator"]'
    ) as HTMLMetaElement | null;
    return meta?.content ?? null;
  });

  if (generator) {
    meta.generator = generator;
  }

  // Clean up generator-prefixed detection results
  let framework: string | null = detected;
  if (detected?.startsWith("generator:")) {
    framework = detected.slice("generator:".length);
  }

  // Check x-powered-by header for server-side frameworks
  if (!framework && poweredByHeader) {
    const header = poweredByHeader.toLowerCase();
    if (header.includes("express")) framework = "Express";
    else if (header.includes("rails") || header.includes("phusion"))
      framework = "Rails";
    else if (header.includes("django")) framework = "Django";
    else if (header.includes("asp.net")) framework = "ASP.NET";
    else if (header.includes("php")) framework = "PHP";
    else if (header.includes("next.js")) framework = "Next.js";
  }

  return { framework, meta };
}
