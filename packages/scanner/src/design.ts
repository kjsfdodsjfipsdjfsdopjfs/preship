import type { Page } from "puppeteer-core";
import type { Violation } from "@preship/shared";

/**
 * Result from design quality checks including violations and total check count.
 */
export interface DesignCheckResult {
  violations: Violation[];
  totalChecks: number;
}

/**
 * Run comprehensive design quality checks against a page.
 *
 * Checks for:
 * - Color palette size (too many hue families)
 * - Color contrast between cards and page background
 * - Image quality (broken, stretched, missing alt)
 * - Icon library consistency (multiple icon libraries loaded)
 * - Border-radius consistency across components
 * - Shadow consistency across components
 * - Animation quality (lazy transitions, long durations)
 * - Favicon presence
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns DesignCheckResult with violations and total check count
 */
export async function runDesignChecks(
  page: Page,
  url: string
): Promise<DesignCheckResult> {
  const violations: Violation[] = [];
  const TOTAL_CHECKS = 8;

  // ── 1. Color palette size ─────────────────────────────────────────────
  try {
    const colorData = await page.evaluate(() => {
      /**
       * Convert an rgb/rgba color string to an approximate hue bucket (0-11).
       * Returns null for achromatic colors (black, white, grays).
       */
      function getHueBucket(color: string): number | null {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        const r = parseInt(match[1]!) / 255;
        const g = parseInt(match[2]!) / 255;
        const b = parseInt(match[3]!) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        // Skip achromatic colors (grays, black, white)
        if (delta < 0.08) return null;

        let hue = 0;
        if (delta === 0) return null;
        if (max === r) hue = ((g - b) / delta) % 6;
        else if (max === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        hue = Math.round(hue * 60);
        if (hue < 0) hue += 360;

        // Bucket into 30-degree segments (12 hue families)
        return Math.floor(hue / 30);
      }

      const elements = document.querySelectorAll("body, body *");
      const hueBuckets = new Set<number>();
      const sampleColors: string[] = [];

      for (const el of Array.from(elements).slice(0, 300)) {
        const styles = window.getComputedStyle(el);
        for (const prop of ["color", "backgroundColor", "borderColor"]) {
          const val = styles.getPropertyValue(prop);
          if (val && val !== "rgba(0, 0, 0, 0)" && val !== "transparent") {
            const bucket = getHueBucket(val);
            if (bucket !== null) {
              hueBuckets.add(bucket);
              if (sampleColors.length < 15) sampleColors.push(val);
            }
          }
        }
      }

      return { hueFamilies: hueBuckets.size, sampleColors };
    });

    if (colorData.hueFamilies > 10) {
      violations.push({
        id: `design-too-many-colors-${randomId()}`,
        category: "design",
        severity: "medium",
        rule: "color-palette-too-large",
        message: `Found ${colorData.hueFamilies} distinct hue families. A cohesive design typically uses 3-5 primary hue families.`,
        url,
        help: "Define a color palette with a primary, secondary, and 1-2 accent colors. Use tints and shades of these base colors for variety.",
      });
    }
  } catch (e) {
    console.error(`[design] Color palette check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 2. Card/background contrast ───────────────────────────────────────
  try {
    const contrastData = await page.evaluate(() => {
      const body = document.body;
      if (!body) return { checked: false };

      const bgColor = window.getComputedStyle(body).backgroundColor;

      // Find card-like elements
      const cards = document.querySelectorAll(
        "[class*='card'], [class*='Card'], article, [role='article'], .panel, .tile"
      );
      let indistinguishableCount = 0;

      for (const card of Array.from(cards).slice(0, 20)) {
        const cardBg = window.getComputedStyle(card).backgroundColor;
        // If card bg is identical to body bg and not transparent
        if (
          cardBg === bgColor &&
          cardBg !== "rgba(0, 0, 0, 0)" &&
          cardBg !== "transparent"
        ) {
          indistinguishableCount++;
        }
      }

      return { checked: true, cardCount: cards.length, indistinguishableCount };
    });

    if (contrastData.checked && (contrastData.indistinguishableCount ?? 0) > 0) {
      violations.push({
        id: `design-card-contrast-${randomId()}`,
        category: "design",
        severity: "low",
        rule: "card-background-indistinguishable",
        message: `${contrastData.indistinguishableCount} of ${contrastData.cardCount} card element(s) have the same background color as the page, making them visually indistinguishable.`,
        url,
        help: "Use a slightly different background color, border, or shadow on card elements to visually separate them from the page background.",
      });
    }
  } catch (e) {
    console.error(`[design] Card contrast check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 3. Image quality ──────────────────────────────────────────────────
  try {
    const imageData = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      const broken: string[] = [];
      const stretched: string[] = [];
      const missingAlt: string[] = [];

      for (const img of images.slice(0, 50)) {
        // Broken images: naturalWidth is 0 when image fails to load
        if (img.complete && img.naturalWidth === 0 && img.src) {
          broken.push(img.src.substring(0, 200));
        }

        // Stretched images: compare rendered aspect ratio vs natural aspect ratio
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const naturalRatio = img.naturalWidth / img.naturalHeight;
          const rect = img.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const displayRatio = rect.width / rect.height;
            const ratioDiff = Math.abs(naturalRatio - displayRatio) / naturalRatio;
            if (ratioDiff > 0.2) {
              stretched.push(
                `${img.src.substring(0, 150)} (natural: ${img.naturalWidth}x${img.naturalHeight}, displayed: ${Math.round(rect.width)}x${Math.round(rect.height)})`
              );
            }
          }
        }

        // Missing alt attribute
        if (!img.hasAttribute("alt")) {
          missingAlt.push(img.outerHTML.substring(0, 150));
        }
      }

      return {
        brokenCount: broken.length,
        broken: broken.slice(0, 5),
        stretchedCount: stretched.length,
        stretched: stretched.slice(0, 5),
        missingAltCount: missingAlt.length,
        missingAlt: missingAlt.slice(0, 5),
      };
    });

    if (imageData.brokenCount > 0) {
      violations.push({
        id: `design-broken-images-${randomId()}`,
        category: "design",
        severity: "critical",
        rule: "broken-images",
        message: `Found ${imageData.brokenCount} broken image(s) that failed to load.`,
        element: imageData.broken.join("\n"),
        url,
        help: "Fix broken image URLs, ensure images are deployed, and add fallback handling for failed loads.",
      });
    }

    if (imageData.stretchedCount > 0) {
      violations.push({
        id: `design-stretched-images-${randomId()}`,
        category: "design",
        severity: "medium",
        rule: "stretched-images",
        message: `Found ${imageData.stretchedCount} image(s) with aspect ratio distortion > 20%.`,
        element: imageData.stretched.join("\n"),
        url,
        help: "Use object-fit: cover/contain on images or ensure width and height attributes match the image's natural aspect ratio.",
      });
    }

    if (imageData.missingAltCount > 0) {
      violations.push({
        id: `design-missing-alt-${randomId()}`,
        category: "design",
        severity: "medium",
        rule: "images-missing-alt",
        message: `Found ${imageData.missingAltCount} image(s) without alt attributes. This affects both accessibility and design intent clarity.`,
        element: imageData.missingAlt.join("\n"),
        url,
        help: "Add descriptive alt text to all images. Use alt=\"\" for purely decorative images.",
      });
    }
  } catch (e) {
    console.error(`[design] Image quality check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 4. Icon library consistency ───────────────────────────────────────
  try {
    const iconData = await page.evaluate(() => {
      const libraries: string[] = [];

      // Check for loaded stylesheets and fonts
      const styleSheetHrefs = Array.from(document.styleSheets)
        .map((s) => {
          try { return s.href || ""; } catch { return ""; }
        })
        .join(" ")
        .toLowerCase();

      const linkHrefs = Array.from(document.querySelectorAll("link[href]"))
        .map((l) => l.getAttribute("href") ?? "")
        .join(" ")
        .toLowerCase();

      const scriptSrcs = Array.from(document.querySelectorAll("script[src]"))
        .map((s) => s.getAttribute("src") ?? "")
        .join(" ")
        .toLowerCase();

      const allRefs = `${styleSheetHrefs} ${linkHrefs} ${scriptSrcs}`;

      if (allRefs.includes("font-awesome") || allRefs.includes("fontawesome")) libraries.push("Font Awesome");
      if (allRefs.includes("material-icons") || allRefs.includes("material+icons")) libraries.push("Material Icons");
      if (allRefs.includes("lucide")) libraries.push("Lucide");
      if (allRefs.includes("heroicons")) libraries.push("Heroicons");
      if (allRefs.includes("bootstrap-icons")) libraries.push("Bootstrap Icons");
      if (allRefs.includes("feather")) libraries.push("Feather Icons");
      if (allRefs.includes("phosphor")) libraries.push("Phosphor Icons");
      if (allRefs.includes("tabler")) libraries.push("Tabler Icons");

      // Also check for SVG sprite or icon font classes in DOM
      if (document.querySelector(".fa, .fas, .far, .fab, .fa-solid, .fa-regular")) {
        if (!libraries.includes("Font Awesome")) libraries.push("Font Awesome");
      }
      if (document.querySelector(".material-icons, .material-symbols-outlined")) {
        if (!libraries.includes("Material Icons")) libraries.push("Material Icons");
      }

      return { libraries, count: libraries.length };
    });

    if (iconData.count > 1) {
      violations.push({
        id: `design-multiple-icon-libs-${randomId()}`,
        category: "design",
        severity: "medium",
        rule: "multiple-icon-libraries",
        message: `Multiple icon libraries detected: ${iconData.libraries.join(", ")}. Using multiple icon sets creates visual inconsistency and increases bundle size.`,
        url,
        help: "Choose a single icon library and use it consistently throughout the site. Remove unused icon library imports.",
      });
    }
  } catch (e) {
    console.error(`[design] Icon library check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 5. Border-radius consistency ──────────────────────────────────────
  try {
    const radiusData = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        "button, [role='button'], input, textarea, select, [class*='card'], [class*='Card'], article, .panel, .tile, .badge, .chip, .tag"
      );
      const radii = new Set<string>();

      for (const el of Array.from(elements).slice(0, 100)) {
        const r = window.getComputedStyle(el).borderRadius;
        if (r && r !== "0px") {
          radii.add(r);
        }
      }

      return { uniqueRadii: radii.size, values: Array.from(radii).slice(0, 10) };
    });

    if (radiusData.uniqueRadii > 4) {
      violations.push({
        id: `design-border-radius-inconsistent-${randomId()}`,
        category: "design",
        severity: "low",
        rule: "border-radius-inconsistency",
        message: `Found ${radiusData.uniqueRadii} distinct border-radius values: ${radiusData.values.join(", ")}. Consistent designs use 2-4 radius values.`,
        url,
        help: "Define a set of border-radius tokens (e.g., sm: 4px, md: 8px, lg: 16px, full: 9999px) and apply them consistently.",
      });
    }
  } catch (e) {
    console.error(`[design] Border-radius check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 6. Shadow consistency ─────────────────────────────────────────────
  try {
    const shadowData = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        "[class*='card'], [class*='Card'], article, button, [role='button'], .panel, .tile, .modal, .dropdown, .popover"
      );
      const shadows = new Set<string>();

      for (const el of Array.from(elements).slice(0, 100)) {
        const s = window.getComputedStyle(el).boxShadow;
        if (s && s !== "none") {
          shadows.add(s);
        }
      }

      return { uniqueShadows: shadows.size, values: Array.from(shadows).slice(0, 5).map((s) => s.substring(0, 80)) };
    });

    if (shadowData.uniqueShadows > 3) {
      violations.push({
        id: `design-shadow-inconsistent-${randomId()}`,
        category: "design",
        severity: "low",
        rule: "shadow-inconsistency",
        message: `Found ${shadowData.uniqueShadows} distinct box-shadow styles. Consistent designs use 2-3 elevation levels.`,
        element: shadowData.values.join("\n"),
        url,
        help: "Define shadow tokens for elevation levels (e.g., sm, md, lg shadows) and use them consistently across components.",
      });
    }
  } catch (e) {
    console.error(`[design] Shadow check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 7. Animation quality ──────────────────────────────────────────────
  try {
    const animData = await page.evaluate(() => {
      const elements = document.querySelectorAll("*");
      const lazyTransitions: string[] = [];
      const longTransitions: string[] = [];

      for (const el of Array.from(elements).slice(0, 300)) {
        const styles = window.getComputedStyle(el);
        const transition = styles.transition;
        if (!transition || transition === "all 0s ease 0s" || transition === "none") continue;

        // Flag "transition: all" (lazy pattern)
        if (transition.startsWith("all ") || transition.includes(", all ")) {
          const tag = el.tagName.toLowerCase();
          const cls = el.className && typeof el.className === "string" ? el.className.split(" ").slice(0, 2).join(".") : "";
          if (lazyTransitions.length < 5) {
            lazyTransitions.push(`${tag}${cls ? "." + cls : ""}: ${transition.substring(0, 80)}`);
          }
        }

        // Flag long duration transitions (> 1000ms) that are not page-level
        const durationMatch = transition.match(/(\d+(?:\.\d+)?)s/);
        if (durationMatch) {
          const durationMs = parseFloat(durationMatch[1]!) * 1000;
          if (durationMs > 1000 && !el.matches("body, html, main, [class*='page'], [class*='route']")) {
            const tag = el.tagName.toLowerCase();
            if (longTransitions.length < 5) {
              longTransitions.push(`${tag}: ${Math.round(durationMs)}ms`);
            }
          }
        }
      }

      return {
        lazyCount: lazyTransitions.length,
        lazySamples: lazyTransitions,
        longCount: longTransitions.length,
        longSamples: longTransitions,
      };
    });

    if (animData.lazyCount > 0) {
      violations.push({
        id: `design-lazy-transitions-${randomId()}`,
        category: "design",
        severity: "low",
        rule: "transition-all",
        message: `Found ${animData.lazyCount} element(s) using "transition: all" which is a lazy pattern that can cause layout thrashing and janky animations.`,
        element: animData.lazySamples.join("\n"),
        url,
        help: "Specify exact properties to transition (e.g., transition: opacity 200ms, transform 200ms) instead of 'all'.",
      });
    }

    if (animData.longCount > 0) {
      violations.push({
        id: `design-long-transitions-${randomId()}`,
        category: "design",
        severity: "low",
        rule: "transition-too-long",
        message: `Found ${animData.longCount} element(s) with transition duration > 1000ms, which can feel sluggish.`,
        element: animData.longSamples.join("\n"),
        url,
        help: "Keep UI transitions between 150-500ms. Use longer durations only for page-level or decorative animations.",
      });
    }
  } catch (e) {
    console.error(`[design] Animation quality check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 8. Favicon presence ───────────────────────────────────────────────
  try {
    const faviconData = await page.evaluate(() => {
      const faviconLink = document.querySelector(
        'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
      );
      return { hasFavicon: !!faviconLink };
    });

    if (!faviconData.hasFavicon) {
      violations.push({
        id: `design-no-favicon-${randomId()}`,
        category: "design",
        severity: "high",
        rule: "missing-favicon",
        message: "No favicon detected. The page is missing a <link rel=\"icon\"> tag in the <head>.",
        url,
        help: "Add a favicon to your site: <link rel=\"icon\" href=\"/favicon.ico\">. Also consider adding an apple-touch-icon for mobile devices.",
      });
    }
  } catch (e) {
    console.error(`[design] Favicon check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { violations, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
