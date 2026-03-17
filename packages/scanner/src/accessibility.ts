import type { Page } from "puppeteer";
import type { Violation } from "@preship/shared";

/**
 * Run axe-core accessibility checks against a page.
 *
 * Injects axe-core into the page context and runs a WCAG 2.1 AA
 * analysis. Handles iframes and shadow DOM by configuring axe to
 * traverse the full document tree.
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns Array of Violation objects for each accessibility issue found
 */
export async function runAccessibilityChecks(
  page: Page,
  url: string
): Promise<Violation[]> {
  try {
    // Inject axe-core into the page
    const axeSource = require("axe-core").source;
    await page.evaluate(axeSource);

    // Run axe analysis with WCAG 2.1 AA tags
    const results = await page.evaluate(() => {
      return new Promise<any>((resolve, reject) => {
        // @ts-expect-error axe is injected at runtime
        window.axe
          .run(document, {
            runOnly: {
              type: "tag",
              values: [
                "wcag2a",
                "wcag2aa",
                "wcag21a",
                "wcag21aa",
                "best-practice",
              ],
            },
            resultTypes: ["violations", "passes", "incomplete"],
            // Analyze iframes if accessible
            iframes: true,
          })
          .then(resolve)
          .catch(reject);
      });
    });

    const violations = results.violations.flatMap((violation: any) =>
      violation.nodes.map((node: any) => ({
        id: `a11y-${violation.id}-${Math.random().toString(36).slice(2, 8)}`,
        category: "accessibility" as const,
        severity: mapAxeSeverity(violation.impact),
        rule: violation.id,
        message: violation.description,
        element: node.html?.substring(0, 500),
        selector: node.target?.[0] ?? undefined,
        url,
        help: violation.help,
        helpUrl: violation.helpUrl,
      }))
    );

    // Also check for issues axe-core doesn't fully cover

    // Check for missing lang attribute on html element
    const hasLang = await page.evaluate(() => {
      const html = document.documentElement;
      return !!html.getAttribute("lang");
    });
    if (!hasLang) {
      violations.push({
        id: `a11y-html-lang-${Math.random().toString(36).slice(2, 8)}`,
        category: "accessibility" as const,
        severity: "high" as const,
        rule: "html-has-lang",
        message:
          "The <html> element does not have a lang attribute, which is required for screen readers.",
        element: "<html>",
        selector: "html",
        url,
        help: 'Add a lang attribute to the <html> element (e.g., lang="en").',
        helpUrl:
          "https://dequeuniversity.com/rules/axe/4.8/html-has-lang",
      });
    }

    // Check for skip navigation link
    const hasSkipNav = await page.evaluate(() => {
      const firstLink = document.querySelector("a");
      if (!firstLink) return false;
      const href = firstLink.getAttribute("href") || "";
      const text = (firstLink.textContent || "").toLowerCase();
      return (
        href.startsWith("#") &&
        (text.includes("skip") ||
          text.includes("main content") ||
          text.includes("navigation"))
      );
    });
    if (!hasSkipNav) {
      violations.push({
        id: `a11y-skip-nav-${Math.random().toString(36).slice(2, 8)}`,
        category: "accessibility" as const,
        severity: "medium" as const,
        rule: "skip-navigation",
        message:
          "No skip navigation link found. Keyboard users need a way to skip to main content.",
        url,
        help: 'Add a "Skip to main content" link as the first focusable element on the page.',
        helpUrl:
          "https://www.w3.org/WAI/WCAG21/Techniques/general/G1",
      });
    }

    // Check heading hierarchy
    const headingIssues = await page.evaluate(() => {
      const headings = Array.from(
        document.querySelectorAll("h1, h2, h3, h4, h5, h6")
      );
      const issues: { level: number; text: string; prevLevel: number }[] = [];
      let prevLevel = 0;
      let h1Count = 0;

      for (const heading of headings) {
        const level = parseInt(heading.tagName[1], 10);
        if (level === 1) h1Count++;

        // Check for skipped heading levels (e.g., h1 -> h3)
        if (prevLevel > 0 && level > prevLevel + 1) {
          issues.push({
            level,
            text: (heading.textContent || "").substring(0, 80),
            prevLevel,
          });
        }
        prevLevel = level;
      }

      // Multiple h1s
      if (h1Count > 1) {
        issues.push({ level: 1, text: `${h1Count} h1 elements found`, prevLevel: 0 });
      }
      // No h1 at all
      if (h1Count === 0 && headings.length > 0) {
        issues.push({ level: 0, text: "No h1 element found", prevLevel: 0 });
      }

      return issues;
    });

    for (const issue of headingIssues) {
      violations.push({
        id: `a11y-heading-order-${Math.random().toString(36).slice(2, 8)}`,
        category: "accessibility" as const,
        severity: "medium" as const,
        rule: "heading-order",
        message:
          issue.level === 0
            ? "No h1 heading found on page"
            : issue.prevLevel === 0
              ? `Multiple h1 headings found (${issue.text})`
              : `Heading level skipped: h${issue.prevLevel} followed by h${issue.level} ("${issue.text}")`,
        url,
        help: "Use a logical heading hierarchy (h1 > h2 > h3) without skipping levels.",
        helpUrl:
          "https://dequeuniversity.com/rules/axe/4.8/heading-order",
      });
    }

    // Check for images without dimensions (causes CLS)
    const imagesWithoutDimensions = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      return imgs
        .filter(
          (img) =>
            !img.getAttribute("width") ||
            !img.getAttribute("height")
        )
        .map((img) => ({
          src: img.src?.substring(0, 200),
          html: img.outerHTML.substring(0, 300),
        }))
        .slice(0, 10); // Cap at 10 to avoid huge reports
    });

    for (const img of imagesWithoutDimensions) {
      violations.push({
        id: `a11y-img-dimensions-${Math.random().toString(36).slice(2, 8)}`,
        category: "accessibility" as const,
        severity: "low" as const,
        rule: "img-dimensions",
        message:
          "Image is missing explicit width/height attributes, which can cause layout shifts.",
        element: img.html,
        url,
        help: "Add width and height attributes to <img> elements to prevent layout shift.",
      });
    }

    return violations;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[accessibility] Check failed: ${message}`);

    return [
      {
        id: `a11y-error-${Math.random().toString(36).slice(2, 8)}`,
        category: "accessibility",
        severity: "critical",
        rule: "axe-error",
        message: `Accessibility audit could not complete: ${message}`,
        url,
        help: "Ensure the page loads correctly and try again.",
        helpUrl: "https://dequeuniversity.com/rules/axe/",
      },
    ];
  }
}

/**
 * Map axe-core impact levels to our shared Severity type.
 */
function mapAxeSeverity(
  impact: string
): "critical" | "high" | "medium" | "low" | "info" {
  switch (impact) {
    case "critical":
      return "critical";
    case "serious":
      return "high";
    case "moderate":
      return "medium";
    case "minor":
      return "low";
    default:
      return "info";
  }
}

/**
 * Count the total number of accessibility checks that passed.
 * Used for scoring calculations.
 *
 * @param page - A Puppeteer Page that has already had axe-core injected
 * @returns Number of passing checks, or 0 if axe-core wasn't injected
 */
export async function countAccessibilityPasses(page: Page): Promise<number> {
  try {
    const passCount = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        // @ts-expect-error axe is injected at runtime
        if (typeof window.axe === "undefined") {
          resolve(0);
          return;
        }
        // @ts-expect-error axe is injected at runtime
        window.axe
          .run(document, {
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
            },
            resultTypes: ["passes"],
          })
          .then((result: any) => resolve(result.passes?.length ?? 0))
          .catch(() => resolve(0));
      });
    });
    return passCount;
  } catch {
    return 0;
  }
}
