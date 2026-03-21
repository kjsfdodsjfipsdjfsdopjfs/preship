import type { Page } from "puppeteer-core";
import type { Violation, CheckResult, CheckCategory } from "@preship/shared";

/**
 * Result from UX/UI checks using cumulative scoring.
 */
export interface UxUiCheckResult {
  violations: Violation[];
  checkResults: CheckResult[];
  totalChecks: number;
}

const UX_CATEGORY: CheckCategory = "ux";

/**
 * Run 20 cumulative UX/UI quality checks against a page.
 * Each check earns points if passed, 0 if not. Max points sum to ~100.
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns UxUiCheckResult with violations, checkResults, and total check count
 */
export async function runUxUiChecks(
  page: Page,
  url: string
): Promise<UxUiCheckResult> {
  const violations: Violation[] = [];
  const checkResults: CheckResult[] = [];
  const TOTAL_CHECKS = 20;

  // ── 1. Hero headline clarity (+5pts) ───────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll("h1, h2"));
      for (const h of headings) {
        const rect = h.getBoundingClientRect();
        if (rect.top < 600 && rect.height > 0) {
          const text = h.textContent?.trim() ?? "";
          const wordCount = text.split(/\s+/).filter(Boolean).length;
          return { found: true, text, wordCount, tooLong: wordCount > 20 };
        }
      }
      return { found: false, text: "", wordCount: 0, tooLong: false };
    });

    const passed = data.found && !data.tooLong;
    checkResults.push({
      id: "ux-hero-clarity",
      category: UX_CATEGORY,
      name: "Hero Headline Clarity",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : "Add a clear h1 or h2 headline in the first 600px of the page with fewer than 20 words that communicates your value proposition.",
    });
    if (!passed) {
      violations.push({
        id: `ux-hero-clarity-${randomId()}`,
        category: UX_CATEGORY,
        severity: "high",
        rule: "hero-headline-clarity",
        message: data.found
          ? `Hero headline is ${data.wordCount} words — too long. Keep it under 20 words for clarity.`
          : "No h1 or h2 headline found in the hero area (top 600px).",
        url,
        help: "Add a clear, concise headline (under 20 words) in the hero area that communicates your value proposition.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-hero-clarity", category: UX_CATEGORY, name: "Hero Headline Clarity", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 2. Hero has supporting subtext (+3pts) ─────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      if (!h1) return { found: false };
      const next = h1.nextElementSibling;
      if (next && next.tagName === "P") {
        const len = (next.textContent?.trim() ?? "").length;
        return { found: true, length: len, goodLength: len >= 20 && len <= 200 };
      }
      // Check for p inside same parent
      const parent = h1.parentElement;
      if (parent) {
        const p = parent.querySelector("p");
        if (p) {
          const len = (p.textContent?.trim() ?? "").length;
          return { found: true, length: len, goodLength: len >= 20 && len <= 200 };
        }
      }
      return { found: false };
    });

    const passed = data.found && (data.goodLength ?? false);
    checkResults.push({
      id: "ux-hero-subtext",
      category: UX_CATEGORY,
      name: "Hero Supporting Subtext",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : "Add a paragraph near your h1 with 20-200 characters of supporting text explaining your product.",
    });
    if (!passed) {
      violations.push({
        id: `ux-hero-subtext-${randomId()}`,
        category: UX_CATEGORY,
        severity: "medium",
        rule: "hero-subtext",
        message: data.found
          ? `Hero subtext is ${data.length} chars — aim for 20-200 characters.`
          : "No supporting paragraph found near the hero headline.",
        url,
        help: "Add a concise paragraph (20-200 chars) near your h1 that supports the headline and explains your value.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-hero-subtext", category: UX_CATEGORY, name: "Hero Supporting Subtext", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 3. Primary CTA above fold (+5pts) ──────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("a, button, [role='button']")).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < 600 && rect.width > 0 && rect.height > 0;
      });
      if (candidates.length === 0) return { found: false };
      // Find the largest one as the primary CTA
      let maxArea = 0;
      let ctaText = "";
      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > maxArea) {
          maxArea = area;
          ctaText = (el.textContent?.trim() ?? "").substring(0, 50);
        }
      }
      return { found: true, text: ctaText };
    });

    const passed = data.found;
    checkResults.push({
      id: "ux-cta-above-fold",
      category: UX_CATEGORY,
      name: "Primary CTA Above Fold",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : "Add a prominent call-to-action button or link in the hero area (top 600px of the page).",
    });
    if (!passed) {
      violations.push({
        id: `ux-cta-above-fold-${randomId()}`,
        category: UX_CATEGORY,
        severity: "high",
        rule: "no-hero-cta",
        message: "No call-to-action button or link found in the hero area (top 600px).",
        url,
        help: "Add a prominent, clearly labeled CTA button in your hero section to guide users toward the primary action.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-cta-above-fold", category: UX_CATEGORY, name: "Primary CTA Above Fold", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 4. CTA text is specific (+3pts) ────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const genericTexts = ["click here", "submit", "learn more", "read more", "click", "here", "more", "go", "ok", "yes"];
      const ctas = Array.from(document.querySelectorAll("a, button, [role='button']")).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < 600 && rect.width > 60 && rect.height > 0;
      });
      if (ctas.length === 0) return { hasCtas: false, allSpecific: true };
      let genericFound = false;
      for (const cta of ctas) {
        const text = (cta.textContent?.trim() ?? "").toLowerCase();
        if (genericTexts.includes(text)) {
          genericFound = true;
          break;
        }
      }
      return { hasCtas: true, allSpecific: !genericFound };
    });

    const passed = data.allSpecific;
    checkResults.push({
      id: "ux-cta-specific-text",
      category: UX_CATEGORY,
      name: "CTA Text Is Specific",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : "Replace generic CTA text like 'Click Here' or 'Submit' with action-oriented text like 'Start Free Trial' or 'Get Started'.",
    });
    if (!passed) {
      violations.push({
        id: `ux-cta-generic-${randomId()}`,
        category: UX_CATEGORY,
        severity: "medium",
        rule: "cta-generic-text",
        message: "CTA buttons use generic text like 'Click Here', 'Submit', or 'Learn More'.",
        url,
        help: "Use specific, action-oriented CTA text that tells users exactly what will happen (e.g., 'Start Free Trial', 'Download PDF').",
      });
    }
  } catch {
    checkResults.push({ id: "ux-cta-specific-text", category: UX_CATEGORY, name: "CTA Text Is Specific", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 5. Navigation exists and is clean (+5pts) ──────────────────────────
  try {
    const data = await page.evaluate(() => {
      const nav = document.querySelector("nav") || document.querySelector("[role='navigation']");
      if (!nav) return { hasNav: false, itemCount: 0 };
      const topItems = nav.querySelectorAll(":scope > ul > li, :scope > a, :scope > div > a, :scope > div > ul > li");
      return { hasNav: true, itemCount: topItems.length };
    });

    const passed = data.hasNav && data.itemCount >= 3 && data.itemCount <= 7;
    checkResults.push({
      id: "ux-navigation-clean",
      category: UX_CATEGORY,
      name: "Navigation Exists and Is Clean",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : data.hasNav
        ? `Navigation has ${data.itemCount} top-level items. Aim for 3-7 items for optimal usability.`
        : "Add a <nav> element with 3-7 top-level navigation items.",
    });
    if (!passed) {
      violations.push({
        id: `ux-navigation-${randomId()}`,
        category: UX_CATEGORY,
        severity: "high",
        rule: "navigation-quality",
        message: data.hasNav
          ? `Navigation has ${data.itemCount} top-level items. Best practice is 3-7 items.`
          : "No <nav> element or [role='navigation'] found.",
        url,
        help: "Add a <nav> element with 3-7 clearly labeled top-level items. Too many items overwhelm users; too few may leave them lost.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-navigation-clean", category: UX_CATEGORY, name: "Navigation Exists and Is Clean", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 6. Forms have proper labels (+5pts) ────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select")
      );
      if (inputs.length === 0) return { hasInputs: false, allLabeled: true, unlabeled: 0 };
      let unlabeled = 0;
      for (const input of inputs.slice(0, 50)) {
        const id = input.id;
        const hasLabelFor = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const hasWrappingLabel = !!input.closest("label");
        const hasAriaLabel = !!input.getAttribute("aria-label") || !!input.getAttribute("aria-labelledby");
        if (!hasLabelFor && !hasWrappingLabel && !hasAriaLabel) {
          unlabeled++;
        }
      }
      return { hasInputs: true, allLabeled: unlabeled === 0, unlabeled };
    });

    const passed = data.allLabeled;
    checkResults.push({
      id: "ux-form-labels",
      category: UX_CATEGORY,
      name: "Forms Have Proper Labels",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : `${data.unlabeled} input(s) lack associated labels. Add <label for="id"> elements or aria-label attributes.`,
    });
    if (!passed) {
      violations.push({
        id: `ux-form-labels-${randomId()}`,
        category: UX_CATEGORY,
        severity: "high",
        rule: "form-inputs-no-labels",
        message: `Found ${data.unlabeled} input(s) without associated labels.`,
        url,
        help: "Add <label for=\"inputId\"> elements, wrap inputs in <label>, or use aria-label/aria-labelledby attributes.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-form-labels", category: UX_CATEGORY, name: "Forms Have Proper Labels", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 7. Form validation visual (+3pts) ──────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select")
      );
      if (inputs.length === 0) return { hasInputs: false, hasValidation: true };
      let hasValidation = false;
      for (const input of inputs.slice(0, 30)) {
        if (
          input.hasAttribute("required") ||
          input.hasAttribute("pattern") ||
          input.getAttribute("aria-invalid") !== null ||
          input.getAttribute("type") === "email" ||
          input.getAttribute("type") === "url" ||
          input.getAttribute("type") === "tel" ||
          input.getAttribute("type") === "number"
        ) {
          hasValidation = true;
          break;
        }
      }
      return { hasInputs: true, hasValidation };
    });

    const passed = !data.hasInputs || data.hasValidation;
    checkResults.push({
      id: "ux-form-validation",
      category: UX_CATEGORY,
      name: "Form Validation Visual",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : "Add required, pattern, or type attributes to form inputs for built-in validation.",
    });
    if (!passed) {
      violations.push({
        id: `ux-form-validation-${randomId()}`,
        category: UX_CATEGORY,
        severity: "medium",
        rule: "form-no-validation",
        message: "Form inputs found without validation attributes (required, pattern, aria-invalid).",
        url,
        help: "Use HTML5 validation attributes (required, pattern, type) or aria-invalid to provide visual validation feedback.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-form-validation", category: UX_CATEGORY, name: "Form Validation Visual", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 8. Loading/skeleton states (+3pts) ─────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const selectors = [
        "[class*='skeleton']", "[class*='Skeleton']",
        "[class*='spinner']", "[class*='Spinner']",
        "[class*='loading']", "[class*='Loading']",
        "[class*='progress']", "[class*='Progress']",
        "[role='progressbar']",
        ".animate-pulse", ".animate-spin",
      ];
      let found = false;
      for (const sel of selectors) {
        if (document.querySelector(sel)) {
          found = true;
          break;
        }
      }
      return { hasLoadingUI: found };
    });

    const passed = data.hasLoadingUI;
    checkResults.push({
      id: "ux-loading-states",
      category: UX_CATEGORY,
      name: "Loading/Skeleton States",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : "Add loading indicators (spinners, skeleton screens, progress bars) for async content.",
    });
    if (!passed) {
      violations.push({
        id: `ux-loading-states-${randomId()}`,
        category: UX_CATEGORY,
        severity: "low",
        rule: "no-loading-states",
        message: "No loading UI patterns detected (skeleton, spinner, progress bar).",
        url,
        help: "Add skeleton screens or loading spinners for content that loads asynchronously to improve perceived performance.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-loading-states", category: UX_CATEGORY, name: "Loading/Skeleton States", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 9. Error messaging (+3pts) ─────────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const hasAlertRole = !!document.querySelector("[role='alert']");
      const hasErrorClasses = !!document.querySelector(
        "[class*='error'], [class*='Error'], [class*='alert'], [class*='Alert'], [aria-live='assertive'], [aria-live='polite']"
      );
      return { hasErrorHandling: hasAlertRole || hasErrorClasses };
    });

    const passed = data.hasErrorHandling;
    checkResults.push({
      id: "ux-error-messaging",
      category: UX_CATEGORY,
      name: "Error Messaging",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : "Add elements with role='alert' or aria-live attributes for error and status messages.",
    });
    if (!passed) {
      violations.push({
        id: `ux-error-messaging-${randomId()}`,
        category: UX_CATEGORY,
        severity: "low",
        rule: "no-error-messaging",
        message: "No error messaging patterns detected (role='alert', aria-live, error classes).",
        url,
        help: "Use role='alert' or aria-live regions for error messages so users (and screen readers) are notified of issues.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-error-messaging", category: UX_CATEGORY, name: "Error Messaging", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 10. Consistent button styling (+5pts) ──────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll("button, [role='button'], input[type='submit'], input[type='button']")
      );
      if (buttons.length < 2) return { fewButtons: true, consistent: true };

      const paddings = new Set<string>();
      const radii = new Set<string>();

      for (const btn of buttons.slice(0, 30)) {
        const s = window.getComputedStyle(btn);
        paddings.add(`${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}`);
        radii.add(s.borderRadius);
      }

      return {
        fewButtons: false,
        consistent: paddings.size <= 3 && radii.size <= 3,
        uniquePaddings: paddings.size,
        uniqueRadii: radii.size,
      };
    });

    const passed = data.consistent;
    checkResults.push({
      id: "ux-button-consistency",
      category: UX_CATEGORY,
      name: "Consistent Button Styling",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : `Buttons have ${data.uniquePaddings} padding and ${data.uniqueRadii} border-radius variants. Standardize to <= 3 of each.`,
    });
    if (!passed) {
      violations.push({
        id: `ux-button-consistency-${randomId()}`,
        category: UX_CATEGORY,
        severity: "medium",
        rule: "button-inconsistency",
        message: `Buttons have ${data.uniquePaddings} padding variants and ${data.uniqueRadii} border-radius variants. Aim for <= 3 of each.`,
        url,
        help: "Standardize button styles using shared CSS classes or design tokens for padding and border-radius.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-button-consistency", category: UX_CATEGORY, name: "Consistent Button Styling", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 11. Hover states on interactive elements (+3pts) ───────────────────
  try {
    const data = await page.evaluate(() => {
      // Check if any stylesheet contains :hover rules
      let hoverRulesFound = false;
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            for (const rule of Array.from(rules)) {
              if (rule instanceof CSSStyleRule && rule.selectorText?.includes(":hover")) {
                hoverRulesFound = true;
                break;
              }
            }
          } catch {
            continue;
          }
          if (hoverRulesFound) break;
        }
      } catch {
        // Stylesheet access failed
      }
      return { hasHoverStyles: hoverRulesFound };
    });

    const passed = data.hasHoverStyles;
    checkResults.push({
      id: "ux-hover-states",
      category: UX_CATEGORY,
      name: "Hover States on Interactive Elements",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : "Add :hover styles to buttons, links, and other interactive elements for visual feedback.",
    });
    if (!passed) {
      violations.push({
        id: `ux-hover-states-${randomId()}`,
        category: UX_CATEGORY,
        severity: "low",
        rule: "no-hover-states",
        message: "No :hover CSS rules detected in accessible stylesheets.",
        url,
        help: "Add :hover styles to interactive elements (buttons, links, cards) to provide visual feedback on mouse interaction.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-hover-states", category: UX_CATEGORY, name: "Hover States on Interactive Elements", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 12. No horizontal overflow (+5pts) ─────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      return { hasOverflow: scrollWidth > clientWidth + 5, scrollWidth, clientWidth };
    });

    const passed = !data.hasOverflow;
    checkResults.push({
      id: "ux-no-horizontal-overflow",
      category: UX_CATEGORY,
      name: "No Horizontal Overflow",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : `Content width (${data.scrollWidth}px) exceeds viewport (${data.clientWidth}px). Fix elements with fixed widths or missing max-width: 100%.`,
    });
    if (!passed) {
      violations.push({
        id: `ux-horizontal-overflow-${randomId()}`,
        category: UX_CATEGORY,
        severity: "high",
        rule: "horizontal-overflow",
        message: `Page has horizontal overflow: content width (${data.scrollWidth}px) exceeds viewport (${data.clientWidth}px).`,
        url,
        help: "Check for elements with fixed widths exceeding the viewport. Use max-width: 100% and overflow-x: hidden where appropriate.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-no-horizontal-overflow", category: UX_CATEGORY, name: "No Horizontal Overflow", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 13. Readable line length (+3pts) ───────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll("main p, article p, section p, .content p, p"));
      if (paragraphs.length === 0) return { hasParagraphs: false, readable: true };
      let goodCount = 0;
      let total = 0;
      for (const p of paragraphs.slice(0, 20)) {
        const text = p.textContent?.trim() ?? "";
        if (text.length < 20) continue;
        total++;
        const rect = p.getBoundingClientRect();
        if (rect.width === 0) continue;
        const styles = window.getComputedStyle(p);
        const fontSize = parseFloat(styles.fontSize);
        if (fontSize === 0) continue;
        // Estimate chars per line: width / (fontSize * 0.5)
        const charsPerLine = rect.width / (fontSize * 0.5);
        if (charsPerLine >= 45 && charsPerLine <= 75) {
          goodCount++;
        }
      }
      return { hasParagraphs: true, readable: total === 0 || goodCount / total >= 0.5 };
    });

    const passed = data.readable;
    checkResults.push({
      id: "ux-readable-line-length",
      category: UX_CATEGORY,
      name: "Readable Line Length",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : "Set max-width on content containers to keep paragraph line length between 45-75 characters.",
    });
    if (!passed) {
      violations.push({
        id: `ux-readable-line-length-${randomId()}`,
        category: UX_CATEGORY,
        severity: "medium",
        rule: "line-length",
        message: "Most paragraphs have line lengths outside the optimal 45-75 character range.",
        url,
        help: "Use max-width (e.g., 65ch or ~680px) on content containers for comfortable reading.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-readable-line-length", category: UX_CATEGORY, name: "Readable Line Length", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 14. Consistent spacing (+5pts) ─────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        "main, section, article, header, footer, div, p, h1, h2, h3, h4, h5, h6"
      );
      const spacingValues = new Set<number>();

      for (const el of Array.from(elements).slice(0, 200)) {
        const styles = window.getComputedStyle(el);
        for (const prop of ["paddingTop", "paddingBottom", "marginTop", "marginBottom"]) {
          const val = parseFloat(styles.getPropertyValue(prop));
          if (val > 0) spacingValues.add(Math.round(val));
        }
      }

      return { uniqueCount: spacingValues.size };
    });

    const passed = data.uniqueCount <= 8;
    checkResults.push({
      id: "ux-consistent-spacing",
      category: UX_CATEGORY,
      name: "Consistent Spacing",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : `Found ${data.uniqueCount} unique spacing values. Adopt a spacing scale (multiples of 4 or 8) with <= 8 values.`,
    });
    if (!passed) {
      violations.push({
        id: `ux-consistent-spacing-${randomId()}`,
        category: UX_CATEGORY,
        severity: "medium",
        rule: "spacing-inconsistency",
        message: `Found ${data.uniqueCount} unique spacing values. Consistent designs use <= 8 spacing values based on a scale.`,
        url,
        help: "Adopt a spacing scale (e.g., 4, 8, 12, 16, 24, 32, 48, 64) and use design tokens or CSS variables.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-consistent-spacing", category: UX_CATEGORY, name: "Consistent Spacing", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 15. Typography hierarchy (+5pts) ───────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const h2 = document.querySelector("h2");
      const h3 = document.querySelector("h3");
      const h1Size = h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : null;
      const h2Size = h2 ? parseFloat(window.getComputedStyle(h2).fontSize) : null;
      const h3Size = h3 ? parseFloat(window.getComputedStyle(h3).fontSize) : null;

      let ordered = true;
      if (h1Size !== null && h2Size !== null && h1Size <= h2Size) ordered = false;
      if (h2Size !== null && h3Size !== null && h2Size <= h3Size) ordered = false;
      if (h1Size !== null && h3Size !== null && h1Size <= h3Size) ordered = false;

      return { ordered, h1Size, h2Size, h3Size };
    });

    const passed = data.ordered;
    checkResults.push({
      id: "ux-typography-hierarchy",
      category: UX_CATEGORY,
      name: "Typography Hierarchy",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : `Heading sizes are not in order: h1=${data.h1Size}px, h2=${data.h2Size}px, h3=${data.h3Size}px. Ensure h1 > h2 > h3.`,
    });
    if (!passed) {
      violations.push({
        id: `ux-typography-hierarchy-${randomId()}`,
        category: UX_CATEGORY,
        severity: "high",
        rule: "heading-size-order",
        message: `Heading hierarchy broken: h1=${data.h1Size}px, h2=${data.h2Size}px, h3=${data.h3Size}px. h1 should be largest.`,
        url,
        help: "Ensure heading font sizes decrease progressively: h1 > h2 > h3 > h4.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-typography-hierarchy", category: UX_CATEGORY, name: "Typography Hierarchy", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 16. Mobile menu (+5pts) ────────────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const menuSelectors = [
        "[class*='hamburger']", "[class*='Hamburger']",
        "[class*='menu-toggle']", "[class*='MenuToggle']",
        "[class*='mobile-menu']", "[class*='MobileMenu']",
        "[class*='nav-toggle']", "[class*='NavToggle']",
        "[aria-label*='menu']", "[aria-label*='Menu']",
        "[aria-label*='navigation']",
        "button[class*='menu']", "button[class*='Menu']",
        ".menu-btn", ".burger",
      ];
      let found = false;
      for (const sel of menuSelectors) {
        if (document.querySelector(sel)) {
          found = true;
          break;
        }
      }
      // Also check for three-line SVG patterns (hamburger icon)
      if (!found) {
        const buttons = document.querySelectorAll("button, [role='button']");
        for (const btn of Array.from(buttons)) {
          const svg = btn.querySelector("svg");
          if (svg) {
            const lines = svg.querySelectorAll("line, rect, path");
            if (lines.length >= 2 && lines.length <= 4) {
              const rect = btn.getBoundingClientRect();
              if (rect.width < 60 && rect.height < 60) {
                found = true;
                break;
              }
            }
          }
        }
      }
      return { hasMobileMenu: found };
    });

    const passed = data.hasMobileMenu;
    checkResults.push({
      id: "ux-mobile-menu",
      category: UX_CATEGORY,
      name: "Mobile Menu",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : "Add a hamburger/menu button for mobile viewports to provide navigation on smaller screens.",
    });
    if (!passed) {
      violations.push({
        id: `ux-mobile-menu-${randomId()}`,
        category: UX_CATEGORY,
        severity: "medium",
        rule: "no-mobile-menu",
        message: "No hamburger/menu toggle button detected for mobile navigation.",
        url,
        help: "Add a hamburger menu button that toggles navigation visibility on mobile viewports.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-mobile-menu", category: UX_CATEGORY, name: "Mobile Menu", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 17. Footer exists and has content (+3pts) ──────────────────────────
  try {
    const data = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      if (!footer) return { hasFooter: false, linkCount: 0 };
      const links = footer.querySelectorAll("a");
      return { hasFooter: true, linkCount: links.length };
    });

    const passed = data.hasFooter && data.linkCount >= 3;
    checkResults.push({
      id: "ux-footer-content",
      category: UX_CATEGORY,
      name: "Footer Exists and Has Content",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : data.hasFooter
        ? `Footer has only ${data.linkCount} links. Add at least 3 links (about, contact, legal, etc.).`
        : "Add a <footer> element with at least 3 useful links.",
    });
    if (!passed) {
      violations.push({
        id: `ux-footer-${randomId()}`,
        category: UX_CATEGORY,
        severity: "low",
        rule: "footer-content",
        message: data.hasFooter
          ? `Footer has only ${data.linkCount} link(s). A useful footer has >= 3 links.`
          : "No <footer> element found.",
        url,
        help: "Add a footer with links to key pages (About, Contact, Privacy Policy, Terms, etc.).",
      });
    }
  } catch {
    checkResults.push({ id: "ux-footer-content", category: UX_CATEGORY, name: "Footer Exists and Has Content", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 18. Keyboard focus visible (+5pts) ─────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      let hasFocusStyles = false;
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            for (const rule of Array.from(rules)) {
              if (rule instanceof CSSStyleRule) {
                const sel = rule.selectorText ?? "";
                if (sel.includes(":focus-visible") || sel.includes(":focus")) {
                  hasFocusStyles = true;
                  break;
                }
              }
            }
          } catch {
            continue;
          }
          if (hasFocusStyles) break;
        }
      } catch {
        // Stylesheet access failed
      }
      return { hasFocusStyles };
    });

    const passed = data.hasFocusStyles;
    checkResults.push({
      id: "ux-keyboard-focus",
      category: UX_CATEGORY,
      name: "Keyboard Focus Visible",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : "Add :focus-visible or :focus styles to interactive elements so keyboard users can see where they are.",
    });
    if (!passed) {
      violations.push({
        id: `ux-keyboard-focus-${randomId()}`,
        category: UX_CATEGORY,
        severity: "high",
        rule: "no-focus-visible",
        message: "No :focus-visible or :focus CSS rules detected. Keyboard users cannot see which element is focused.",
        url,
        help: "Add :focus-visible styles (outline, box-shadow, etc.) to interactive elements for keyboard accessibility.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-keyboard-focus", category: UX_CATEGORY, name: "Keyboard Focus Visible", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 19. No auto-playing media (+3pts) ──────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const autoplayMedia = document.querySelectorAll("video[autoplay], audio[autoplay]");
      return { hasAutoplay: autoplayMedia.length > 0, count: autoplayMedia.length };
    });

    const passed = !data.hasAutoplay;
    checkResults.push({
      id: "ux-no-autoplay-media",
      category: UX_CATEGORY,
      name: "No Auto-Playing Media",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : `Found ${data.count} auto-playing media element(s). Remove the autoplay attribute or add muted.`,
    });
    if (!passed) {
      violations.push({
        id: `ux-autoplay-media-${randomId()}`,
        category: UX_CATEGORY,
        severity: "medium",
        rule: "autoplay-media",
        message: `Found ${data.count} video/audio element(s) with autoplay attribute. Auto-playing media disrupts user experience.`,
        url,
        help: "Remove the autoplay attribute from video/audio elements, or at minimum add the 'muted' attribute.",
      });
    }
  } catch {
    checkResults.push({ id: "ux-no-autoplay-media", category: UX_CATEGORY, name: "No Auto-Playing Media", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 20. Page has meaningful title (+3pts) ──────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const title = document.title?.trim() ?? "";
      const defaultTitles = [
        "", "react app", "next app", "vite app", "create react app",
        "nuxt app", "angular app", "vue app", "svelte app",
        "document", "untitled", "home", "index", "localhost",
        "webpack app", "parcel app",
      ];
      const isDefault = defaultTitles.includes(title.toLowerCase());
      return { title, isDefault, isEmpty: title.length === 0 };
    });

    const passed = !data.isDefault && !data.isEmpty;
    checkResults.push({
      id: "ux-meaningful-title",
      category: UX_CATEGORY,
      name: "Page Has Meaningful Title",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : data.isEmpty
        ? "Set a meaningful <title> in the page <head> that describes the page content."
        : `Title "${data.title}" appears to be a default framework title. Set a unique, descriptive title.`,
    });
    if (!passed) {
      violations.push({
        id: `ux-meaningful-title-${randomId()}`,
        category: UX_CATEGORY,
        severity: "medium",
        rule: "default-page-title",
        message: data.isEmpty
          ? "Page has no title set."
          : `Page title "${data.title}" appears to be a default framework title.`,
        url,
        help: "Set a unique, descriptive <title> that includes your brand and page purpose (e.g., 'PreShip - Ship Quality Apps').",
      });
    }
  } catch {
    checkResults.push({ id: "ux-meaningful-title", category: UX_CATEGORY, name: "Page Has Meaningful Title", passed: false, points: 0, maxPoints: 3 });
  }

  return { violations, checkResults, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
