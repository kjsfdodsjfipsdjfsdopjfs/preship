import type { Page } from "puppeteer-core";
import type { Violation } from "@preship/shared";

/**
 * Result from UX/UI checks including violations and total check count.
 */
export interface UxUiCheckResult {
  violations: Violation[];
  totalChecks: number;
}

/**
 * Run comprehensive UX/UI checks against a page.
 *
 * Checks for:
 * - Spacing consistency (padding/margin scale)
 * - Typography hierarchy (font-size count and heading order)
 * - Button consistency (padding, border-radius, font-size)
 * - Form usability (labels, placeholder-only inputs)
 * - CTA visibility (size and contrast of primary CTA)
 * - Dark mode support (prefers-color-scheme or class toggle)
 * - Responsive overflow (horizontal scrollbar)
 * - Z-index sanity (z-index > 999)
 * - Navigation presence (<nav> or role=navigation)
 * - Empty states (lists/tables with empty state messaging)
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns UxUiCheckResult with violations and total check count
 */
export async function runUxUiChecks(
  page: Page,
  url: string
): Promise<UxUiCheckResult> {
  const violations: Violation[] = [];
  const TOTAL_CHECKS = 10;

  // ── 1. Spacing consistency ────────────────────────────────────────────
  try {
    const spacingData = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        "main, section, article, header, footer, div, p, h1, h2, h3, h4, h5, h6"
      );
      const spacingValues = new Set<number>();

      for (const el of Array.from(elements).slice(0, 200)) {
        const styles = window.getComputedStyle(el);
        for (const prop of [
          "paddingTop",
          "paddingBottom",
          "paddingLeft",
          "paddingRight",
          "marginTop",
          "marginBottom",
          "marginLeft",
          "marginRight",
        ]) {
          const val = parseFloat(styles.getPropertyValue(prop));
          if (val > 0) spacingValues.add(Math.round(val));
        }
      }

      return { uniqueCount: spacingValues.size, values: Array.from(spacingValues).sort((a, b) => a - b).slice(0, 20) };
    });

    if (spacingData.uniqueCount > 10) {
      violations.push({
        id: `ux-spacing-inconsistent-${randomId()}`,
        category: "ux",
        severity: "medium",
        rule: "spacing-inconsistency",
        message: `Found ${spacingData.uniqueCount} unique spacing values. Consistent designs typically use a scale based on multiples of 4 or 8. Sample values: ${spacingData.values.join(", ")}px.`,
        url,
        help: "Adopt a spacing scale (e.g., 4, 8, 12, 16, 24, 32, 48, 64) and use design tokens or CSS variables for consistency.",
      });
    }
  } catch (e) {
    console.error(`[ux-ui] Spacing check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 2. Typography hierarchy ───────────────────────────────────────────
  try {
    const typoData = await page.evaluate(() => {
      const allTextEls = document.querySelectorAll(
        "h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label, button"
      );
      const fontSizes = new Set<string>();
      for (const el of Array.from(allTextEls).slice(0, 300)) {
        const size = window.getComputedStyle(el).fontSize;
        if (size) fontSizes.add(size);
      }

      // Check heading order: h1 > h2 > h3
      const h1 = document.querySelector("h1");
      const h2 = document.querySelector("h2");
      const h3 = document.querySelector("h3");
      const h1Size = h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : null;
      const h2Size = h2 ? parseFloat(window.getComputedStyle(h2).fontSize) : null;
      const h3Size = h3 ? parseFloat(window.getComputedStyle(h3).fontSize) : null;

      let headingOrderBroken = false;
      if (h1Size !== null && h2Size !== null && h1Size <= h2Size) headingOrderBroken = true;
      if (h2Size !== null && h3Size !== null && h2Size <= h3Size) headingOrderBroken = true;
      if (h1Size !== null && h3Size !== null && h1Size <= h3Size) headingOrderBroken = true;

      return {
        distinctSizes: fontSizes.size,
        sizes: Array.from(fontSizes).slice(0, 10),
        headingOrderBroken,
        h1Size,
        h2Size,
        h3Size,
      };
    });

    if (typoData.distinctSizes > 6) {
      violations.push({
        id: `ux-typography-too-many-sizes-${randomId()}`,
        category: "ux",
        severity: "medium",
        rule: "typography-too-many-sizes",
        message: `Found ${typoData.distinctSizes} distinct font sizes. A clear typographic hierarchy should use 4-6 sizes max.`,
        url,
        help: "Define a type scale (e.g., 12, 14, 16, 20, 24, 32px) and stick to it consistently across the page.",
      });
    }

    if (typoData.headingOrderBroken) {
      violations.push({
        id: `ux-heading-size-order-${randomId()}`,
        category: "ux",
        severity: "high",
        rule: "heading-size-order",
        message: `Heading font-size hierarchy is broken (h1: ${typoData.h1Size}px, h2: ${typoData.h2Size}px, h3: ${typoData.h3Size}px). h1 should be largest, then h2, then h3.`,
        url,
        help: "Ensure heading font sizes decrease progressively: h1 > h2 > h3 > h4 etc.",
      });
    }
  } catch (e) {
    console.error(`[ux-ui] Typography check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 3. Button consistency ─────────────────────────────────────────────
  try {
    const buttonData = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll("button, [role='button'], input[type='submit'], input[type='button']")
      );
      if (buttons.length < 2) return { count: buttons.length, inconsistent: false };

      const paddings = new Set<string>();
      const radii = new Set<string>();
      const fontSizes = new Set<string>();

      for (const btn of buttons.slice(0, 30)) {
        const s = window.getComputedStyle(btn);
        paddings.add(`${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}`);
        radii.add(s.borderRadius);
        fontSizes.add(s.fontSize);
      }

      return {
        count: buttons.length,
        inconsistent: paddings.size > 3 || radii.size > 3 || fontSizes.size > 3,
        uniquePaddings: paddings.size,
        uniqueRadii: radii.size,
        uniqueFontSizes: fontSizes.size,
      };
    });

    if (buttonData.inconsistent) {
      violations.push({
        id: `ux-button-inconsistency-${randomId()}`,
        category: "ux",
        severity: "medium",
        rule: "button-inconsistency",
        message: `Buttons have inconsistent styles across ${buttonData.count} buttons: ${buttonData.uniquePaddings} padding variants, ${buttonData.uniqueRadii} border-radius variants, ${buttonData.uniqueFontSizes} font-size variants.`,
        url,
        help: "Standardize button styles using shared CSS classes or design tokens for padding, border-radius, and font-size.",
      });
    }
  } catch (e) {
    console.error(`[ux-ui] Button consistency check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 4. Form usability ─────────────────────────────────────────────────
  try {
    const formData = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select")
      );
      const unlabeledInputs: string[] = [];
      const placeholderOnly: string[] = [];

      for (const input of inputs.slice(0, 50)) {
        const id = input.id;
        const hasLabelFor = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const hasWrappingLabel = !!input.closest("label");
        const hasAriaLabel = !!input.getAttribute("aria-label") || !!input.getAttribute("aria-labelledby");

        if (!hasLabelFor && !hasWrappingLabel && !hasAriaLabel) {
          unlabeledInputs.push(input.outerHTML.substring(0, 150));
        }

        const placeholder = input.getAttribute("placeholder");
        if (placeholder && !hasLabelFor && !hasWrappingLabel && !hasAriaLabel) {
          placeholderOnly.push(input.outerHTML.substring(0, 150));
        }
      }

      return { unlabeledCount: unlabeledInputs.length, placeholderOnlyCount: placeholderOnly.length, samples: unlabeledInputs.slice(0, 5) };
    });

    if (formData.unlabeledCount > 0) {
      violations.push({
        id: `ux-form-no-labels-${randomId()}`,
        category: "ux",
        severity: "high",
        rule: "form-inputs-no-labels",
        message: `Found ${formData.unlabeledCount} input(s) without associated labels. Labels are essential for usability and accessibility.`,
        element: formData.samples.join("\n"),
        url,
        help: "Add <label for=\"inputId\"> elements, wrap inputs in <label>, or use aria-label/aria-labelledby attributes.",
      });
    }

    if (formData.placeholderOnlyCount > 0) {
      violations.push({
        id: `ux-placeholder-only-${randomId()}`,
        category: "ux",
        severity: "medium",
        rule: "placeholder-only-inputs",
        message: `Found ${formData.placeholderOnlyCount} input(s) that rely on placeholder text as the only label. Placeholders disappear on focus and are not accessible labels.`,
        url,
        help: "Always provide a visible label in addition to placeholder text. Placeholders should be supplementary hints, not replacements for labels.",
      });
    }
  } catch (e) {
    console.error(`[ux-ui] Form usability check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 5. CTA visibility ─────────────────────────────────────────────────
  try {
    const ctaData = await page.evaluate(() => {
      // Look for the first prominent button/link in the top portion of the page
      const heroArea = 600; // pixels from top
      const candidates = Array.from(
        document.querySelectorAll("a, button, [role='button']")
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < heroArea && rect.width > 0 && rect.height > 0;
      });

      if (candidates.length === 0) return { found: false };

      // Find the largest button/link in the hero area as the likely CTA
      let cta = candidates[0]!;
      let maxArea = 0;
      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > maxArea) {
          maxArea = area;
          cta = el;
        }
      }

      const rect = cta.getBoundingClientRect();
      const styles = window.getComputedStyle(cta);
      const tooSmall = rect.width < 100 || rect.height < 36;

      return {
        found: true,
        tooSmall,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        fontSize: styles.fontSize,
        html: cta.outerHTML.substring(0, 200),
      };
    });

    if (!ctaData.found) {
      violations.push({
        id: `ux-no-cta-${randomId()}`,
        category: "ux",
        severity: "high",
        rule: "no-hero-cta",
        message: "No call-to-action button or link found in the hero area (top 600px of page).",
        url,
        help: "Add a prominent, clearly labeled CTA button in your hero section to guide users toward the primary action.",
      });
    } else if (ctaData.tooSmall) {
      violations.push({
        id: `ux-cta-too-small-${randomId()}`,
        category: "ux",
        severity: "medium",
        rule: "cta-too-small",
        message: `Primary CTA button is too small (${ctaData.width}x${ctaData.height}px). Recommended minimum is 100x36px.`,
        element: ctaData.html,
        url,
        help: "Make the primary CTA button large and prominent. Minimum recommended size is 100px wide and 36px tall.",
      });
    }
  } catch (e) {
    console.error(`[ux-ui] CTA visibility check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 6. Dark mode support ──────────────────────────────────────────────
  try {
    const darkModeData = await page.evaluate(() => {
      // Check for prefers-color-scheme in stylesheets
      let hasMediaQuery = false;
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            for (const rule of Array.from(rules)) {
              if (rule instanceof CSSMediaRule) {
                const media = rule.conditionText || rule.media?.mediaText || "";
                if (media.includes("prefers-color-scheme")) {
                  hasMediaQuery = true;
                  break;
                }
              }
            }
          } catch {
            // Cross-origin stylesheet, skip
            continue;
          }
          if (hasMediaQuery) break;
        }
      } catch {
        // Stylesheet access failed
      }

      // Check for dark mode class toggle
      const hasDarkClass =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark") ||
        !!document.querySelector("[data-theme]") ||
        !!document.querySelector("[data-mode]");

      return { hasMediaQuery, hasDarkClass };
    });

    if (!darkModeData.hasMediaQuery && !darkModeData.hasDarkClass) {
      violations.push({
        id: `ux-no-dark-mode-${randomId()}`,
        category: "ux",
        severity: "info",
        rule: "no-dark-mode-support",
        message: "No dark mode support detected. No prefers-color-scheme media query or dark mode class toggle found.",
        url,
        help: "Consider adding dark mode support via CSS prefers-color-scheme media query or a class-based toggle (e.g., Tailwind's 'dark' class).",
      });
    }
  } catch (e) {
    console.error(`[ux-ui] Dark mode check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 7. Responsive overflow ────────────────────────────────────────────
  try {
    const overflowData = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      return { hasOverflow: scrollWidth > clientWidth + 5, scrollWidth, clientWidth };
    });

    if (overflowData.hasOverflow) {
      violations.push({
        id: `ux-horizontal-overflow-${randomId()}`,
        category: "ux",
        severity: "high",
        rule: "horizontal-overflow",
        message: `Page has horizontal overflow: content width (${overflowData.scrollWidth}px) exceeds viewport (${overflowData.clientWidth}px).`,
        url,
        help: "Check for elements with fixed widths exceeding the viewport. Use max-width: 100% and overflow-x: hidden where appropriate.",
      });
    }
  } catch (e) {
    console.error(`[ux-ui] Overflow check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 8. Z-index sanity ─────────────────────────────────────────────────
  try {
    const zIndexData = await page.evaluate(() => {
      const highZElements: { selector: string; zIndex: string }[] = [];
      const elements = document.querySelectorAll("*");

      for (const el of Array.from(elements).slice(0, 500)) {
        const z = window.getComputedStyle(el).zIndex;
        if (z !== "auto" && parseInt(z, 10) > 999) {
          const tag = el.tagName.toLowerCase();
          const id = el.id ? `#${el.id}` : "";
          const cls = el.className && typeof el.className === "string"
            ? `.${el.className.split(" ").filter(Boolean).slice(0, 2).join(".")}`
            : "";
          if (highZElements.length < 10) {
            highZElements.push({ selector: `${tag}${id}${cls}`, zIndex: z });
          }
        }
      }

      return { count: highZElements.length, elements: highZElements };
    });

    if (zIndexData.count > 0) {
      violations.push({
        id: `ux-high-z-index-${randomId()}`,
        category: "ux",
        severity: "low",
        rule: "z-index-too-high",
        message: `Found ${zIndexData.count} element(s) with z-index > 999. High z-index values can cause stacking context issues.`,
        element: zIndexData.elements.map((e) => `${e.selector} (z-index: ${e.zIndex})`).join("\n"),
        url,
        help: "Keep z-index values low and manageable. Use a z-index scale (e.g., 1, 10, 100) instead of arbitrary large numbers.",
      });
    }
  } catch (e) {
    console.error(`[ux-ui] Z-index check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 9. Navigation presence ────────────────────────────────────────────
  try {
    const navData = await page.evaluate(() => {
      const hasNav = !!document.querySelector("nav");
      const hasRoleNav = !!document.querySelector("[role='navigation']");
      return { hasNavigation: hasNav || hasRoleNav };
    });

    if (!navData.hasNavigation) {
      violations.push({
        id: `ux-no-navigation-${randomId()}`,
        category: "ux",
        severity: "high",
        rule: "no-navigation",
        message: "No <nav> element or [role='navigation'] found. Users may struggle to navigate the site.",
        url,
        help: "Add a <nav> element containing your site's main navigation links.",
      });
    }
  } catch (e) {
    console.error(`[ux-ui] Navigation check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 10. Empty states ──────────────────────────────────────────────────
  try {
    const emptyStateData = await page.evaluate(() => {
      const lists = document.querySelectorAll("ul, ol, table, [role='list'], [role='table']");
      const emptyContainers: string[] = [];

      for (const container of Array.from(lists).slice(0, 30)) {
        const text = container.textContent?.trim() ?? "";
        const children = container.children.length;
        // Check for empty lists/tables with no children or very little content
        if (children === 0 && text.length === 0) {
          emptyContainers.push(container.outerHTML.substring(0, 150));
        }
      }

      return { emptyCount: emptyContainers.length, samples: emptyContainers.slice(0, 5) };
    });

    if (emptyStateData.emptyCount > 0) {
      violations.push({
        id: `ux-empty-container-no-state-${randomId()}`,
        category: "ux",
        severity: "low",
        rule: "missing-empty-state",
        message: `Found ${emptyStateData.emptyCount} empty list(s) or table(s) without empty state messaging.`,
        element: emptyStateData.samples.join("\n"),
        url,
        help: "When a list or table has no data, show a helpful empty state message (e.g., 'No items yet') instead of rendering an empty container.",
      });
    }
  } catch (e) {
    console.error(`[ux-ui] Empty state check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { violations, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
