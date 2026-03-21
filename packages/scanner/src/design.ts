import type { Page } from "puppeteer-core";
import type { Violation, CheckResult, CheckCategory } from "@preship/shared";

/**
 * Result from design quality checks using cumulative scoring.
 */
export interface DesignCheckResult {
  violations: Violation[];
  checkResults: CheckResult[];
  totalChecks: number;
}

const DESIGN_CATEGORY: CheckCategory = "design";

/**
 * Run 20 cumulative design quality checks against a page.
 * Each check earns points if passed, 0 if not. Max points sum to ~100.
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns DesignCheckResult with violations, checkResults, and total check count
 */
export async function runDesignChecks(
  page: Page,
  url: string
): Promise<DesignCheckResult> {
  const violations: Violation[] = [];
  const checkResults: CheckResult[] = [];
  const TOTAL_CHECKS = 20;

  // ── 1. Limited color palette (+5pts) ───────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      function getHueBucket(color: string): number | null {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        const r = parseInt(match[1]!) / 255;
        const g = parseInt(match[2]!) / 255;
        const b = parseInt(match[3]!) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        if (delta < 0.08) return null;
        let hue = 0;
        if (max === r) hue = ((g - b) / delta) % 6;
        else if (max === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        hue = Math.round(hue * 60);
        if (hue < 0) hue += 360;
        return Math.floor(hue / 30);
      }

      const elements = document.querySelectorAll("body, body *");
      const hueBuckets = new Set<number>();

      for (const el of Array.from(elements).slice(0, 300)) {
        const styles = window.getComputedStyle(el);
        for (const prop of ["color", "backgroundColor", "borderColor"]) {
          const val = styles.getPropertyValue(prop);
          if (val && val !== "rgba(0, 0, 0, 0)" && val !== "transparent") {
            const bucket = getHueBucket(val);
            if (bucket !== null) hueBuckets.add(bucket);
          }
        }
      }

      return { hueFamilies: hueBuckets.size };
    });

    const passed = data.hueFamilies <= 5;
    checkResults.push({
      id: "design-limited-palette",
      category: DESIGN_CATEGORY,
      name: "Limited Color Palette",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : `Found ${data.hueFamilies} distinct hue families. Reduce to <= 5 for a cohesive palette.`,
    });
    if (!passed) {
      violations.push({
        id: `design-palette-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "medium",
        rule: "color-palette-too-large",
        message: `Found ${data.hueFamilies} distinct hue families. A cohesive design uses 3-5 hue families.`,
        url,
        help: "Define a color palette with a primary, secondary, and 1-2 accent colors. Use tints and shades for variety.",
      });
    }
  } catch {
    checkResults.push({ id: "design-limited-palette", category: DESIGN_CATEGORY, name: "Limited Color Palette", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 2. Consistent typography (+5pts) ───────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const elements = document.querySelectorAll("body, body *");
      const families = new Set<string>();

      for (const el of Array.from(elements).slice(0, 300)) {
        const family = window.getComputedStyle(el).fontFamily;
        if (family) {
          // Normalize: take the first font in the stack
          const primary = family.split(",")[0]?.trim().replace(/['"]/g, "").toLowerCase() ?? "";
          if (primary) families.add(primary);
        }
      }

      return { familyCount: families.size, families: Array.from(families).slice(0, 6) };
    });

    const passed = data.familyCount <= 3;
    checkResults.push({
      id: "design-consistent-typography",
      category: DESIGN_CATEGORY,
      name: "Consistent Typography",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : `Using ${data.familyCount} font families (${data.families.join(", ")}). Limit to <= 3.`,
    });
    if (!passed) {
      violations.push({
        id: `design-typography-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "medium",
        rule: "too-many-fonts",
        message: `Using ${data.familyCount} font families: ${data.families.join(", ")}. Best practice is <= 3.`,
        url,
        help: "Choose 2-3 complementary fonts (heading, body, monospace) and use them consistently.",
      });
    }
  } catch {
    checkResults.push({ id: "design-consistent-typography", category: DESIGN_CATEGORY, name: "Consistent Typography", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 3. Visual hierarchy (+5pts) ────────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const h2 = document.querySelector("h2");
      const h3 = document.querySelector("h3");
      const p = document.querySelector("p");
      const h1Size = h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : null;
      const h2Size = h2 ? parseFloat(window.getComputedStyle(h2).fontSize) : null;
      const h3Size = h3 ? parseFloat(window.getComputedStyle(h3).fontSize) : null;
      const pSize = p ? parseFloat(window.getComputedStyle(p).fontSize) : null;

      let clear = true;
      if (h1Size !== null && h2Size !== null && h1Size - h2Size < 2) clear = false;
      if (h2Size !== null && h3Size !== null && h2Size - h3Size < 2) clear = false;
      if (h3Size !== null && pSize !== null && h3Size - pSize < 1) clear = false;

      return { clear, h1Size, h2Size, h3Size, pSize };
    });

    const passed = data.clear;
    checkResults.push({
      id: "design-visual-hierarchy",
      category: DESIGN_CATEGORY,
      name: "Visual Hierarchy",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : "Increase size differentiation between heading levels. Each level should be noticeably larger than the next.",
    });
    if (!passed) {
      violations.push({
        id: `design-hierarchy-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "medium",
        rule: "weak-visual-hierarchy",
        message: `Heading sizes lack clear differentiation: h1=${data.h1Size}px, h2=${data.h2Size}px, h3=${data.h3Size}px, p=${data.pSize}px.`,
        url,
        help: "Ensure at least 2px difference between heading levels and clear distinction from body text.",
      });
    }
  } catch {
    checkResults.push({ id: "design-visual-hierarchy", category: DESIGN_CATEGORY, name: "Visual Hierarchy", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 4. No broken images (+5pts) ────────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      let broken = 0;
      const brokenSrcs: string[] = [];
      for (const img of images.slice(0, 50)) {
        if (img.complete && img.naturalWidth === 0 && img.src) {
          broken++;
          if (brokenSrcs.length < 5) brokenSrcs.push(img.src.substring(0, 200));
        }
      }
      return { broken, brokenSrcs, total: images.length };
    });

    const passed = data.broken === 0;
    checkResults.push({
      id: "design-no-broken-images",
      category: DESIGN_CATEGORY,
      name: "No Broken Images",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : `${data.broken} image(s) failed to load. Fix broken URLs or ensure images are deployed.`,
    });
    if (!passed) {
      violations.push({
        id: `design-broken-images-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "critical",
        rule: "broken-images",
        message: `Found ${data.broken} broken image(s) that failed to load.`,
        element: data.brokenSrcs.join("\n"),
        url,
        help: "Fix broken image URLs, ensure images are deployed, and add fallback handling for failed loads.",
      });
    }
  } catch {
    checkResults.push({ id: "design-no-broken-images", category: DESIGN_CATEGORY, name: "No Broken Images", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 5. All images have alt text (+5pts) ────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      let missingAlt = 0;
      for (const img of images.slice(0, 50)) {
        if (!img.hasAttribute("alt")) missingAlt++;
      }
      return { missingAlt, total: images.length };
    });

    const passed = data.missingAlt === 0;
    checkResults.push({
      id: "design-images-alt-text",
      category: DESIGN_CATEGORY,
      name: "All Images Have Alt Text",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : `${data.missingAlt} of ${data.total} image(s) missing alt attribute. Add descriptive alt text or alt="" for decorative images.`,
    });
    if (!passed) {
      violations.push({
        id: `design-missing-alt-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "medium",
        rule: "images-missing-alt",
        message: `${data.missingAlt} image(s) without alt attributes.`,
        url,
        help: "Add descriptive alt text to all images. Use alt=\"\" for purely decorative images.",
      });
    }
  } catch {
    checkResults.push({ id: "design-images-alt-text", category: DESIGN_CATEGORY, name: "All Images Have Alt Text", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 6. Images use modern formats (+3pts) ──────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      if (images.length === 0) return { hasImages: false, hasModern: true };
      let modernCount = 0;
      for (const img of images.slice(0, 50)) {
        const src = (img.src || img.currentSrc || "").toLowerCase();
        if (src.includes(".webp") || src.includes(".avif")) {
          modernCount++;
        }
      }
      // Also check <picture> sources
      const sources = document.querySelectorAll("picture source");
      for (const source of Array.from(sources)) {
        const type = source.getAttribute("type") ?? "";
        if (type.includes("webp") || type.includes("avif")) {
          modernCount++;
          break;
        }
      }
      return { hasImages: true, hasModern: modernCount > 0 };
    });

    const passed = !data.hasImages || data.hasModern;
    checkResults.push({
      id: "design-modern-image-formats",
      category: DESIGN_CATEGORY,
      name: "Images Use Modern Formats",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : "Convert images to WebP or AVIF for better compression and faster loading.",
    });
    if (!passed) {
      violations.push({
        id: `design-modern-formats-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "low",
        rule: "no-modern-image-formats",
        message: "No WebP or AVIF images detected. Modern formats offer 25-50% better compression.",
        url,
        help: "Use WebP or AVIF formats for images. Use <picture> with <source> for fallback support.",
      });
    }
  } catch {
    checkResults.push({ id: "design-modern-image-formats", category: DESIGN_CATEGORY, name: "Images Use Modern Formats", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 7. Responsive images (+3pts) ──────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      if (images.length === 0) return { hasImages: false, hasResponsive: true };
      let responsiveCount = 0;
      for (const img of images.slice(0, 50)) {
        if (img.hasAttribute("srcset") || img.hasAttribute("sizes") || img.closest("picture")) {
          responsiveCount++;
        }
      }
      return { hasImages: true, hasResponsive: responsiveCount > 0, total: images.length };
    });

    const passed = !data.hasImages || data.hasResponsive;
    checkResults.push({
      id: "design-responsive-images",
      category: DESIGN_CATEGORY,
      name: "Responsive Images",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : "Use srcset, sizes attributes, or <picture> elements for responsive image loading.",
    });
    if (!passed) {
      violations.push({
        id: `design-responsive-images-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "low",
        rule: "no-responsive-images",
        message: "No responsive image attributes (srcset, sizes, picture) detected.",
        url,
        help: "Use srcset and sizes attributes or <picture> elements to serve appropriate image sizes per viewport.",
      });
    }
  } catch {
    checkResults.push({ id: "design-responsive-images", category: DESIGN_CATEGORY, name: "Responsive Images", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 8. Consistent border-radius (+3pts) ────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        "button, [role='button'], input, textarea, select, [class*='card'], [class*='Card'], article, .panel, .tile"
      );
      const radii = new Set<string>();
      for (const el of Array.from(elements).slice(0, 100)) {
        const r = window.getComputedStyle(el).borderRadius;
        if (r && r !== "0px") radii.add(r);
      }
      return { uniqueRadii: radii.size, values: Array.from(radii).slice(0, 8) };
    });

    const passed = data.uniqueRadii <= 4;
    checkResults.push({
      id: "design-consistent-radius",
      category: DESIGN_CATEGORY,
      name: "Consistent Border-Radius",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : `Found ${data.uniqueRadii} unique border-radius values. Standardize to <= 4.`,
    });
    if (!passed) {
      violations.push({
        id: `design-radius-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "low",
        rule: "border-radius-inconsistency",
        message: `Found ${data.uniqueRadii} distinct border-radius values: ${data.values.join(", ")}.`,
        url,
        help: "Define border-radius tokens (e.g., sm: 4px, md: 8px, lg: 16px, full: 9999px) and apply consistently.",
      });
    }
  } catch {
    checkResults.push({ id: "design-consistent-radius", category: DESIGN_CATEGORY, name: "Consistent Border-Radius", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 9. Consistent shadows (+3pts) ─────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        "[class*='card'], [class*='Card'], article, button, [role='button'], .panel, .tile, .modal, .dropdown"
      );
      const shadows = new Set<string>();
      for (const el of Array.from(elements).slice(0, 100)) {
        const s = window.getComputedStyle(el).boxShadow;
        if (s && s !== "none") shadows.add(s);
      }
      return { uniqueShadows: shadows.size };
    });

    const passed = data.uniqueShadows <= 3;
    checkResults.push({
      id: "design-consistent-shadows",
      category: DESIGN_CATEGORY,
      name: "Consistent Shadows",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : `Found ${data.uniqueShadows} unique box-shadow patterns. Standardize to <= 3 elevation levels.`,
    });
    if (!passed) {
      violations.push({
        id: `design-shadows-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "low",
        rule: "shadow-inconsistency",
        message: `Found ${data.uniqueShadows} distinct box-shadow styles. Use 2-3 elevation levels.`,
        url,
        help: "Define shadow tokens for elevation levels (sm, md, lg) and use them consistently.",
      });
    }
  } catch {
    checkResults.push({ id: "design-consistent-shadows", category: DESIGN_CATEGORY, name: "Consistent Shadows", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 10. Subtle animations (+3pts) ─────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const elements = document.querySelectorAll("*");
      let hasTransitionAll = false;
      let hasLongTransition = false;

      for (const el of Array.from(elements).slice(0, 300)) {
        const transition = window.getComputedStyle(el).transition;
        if (!transition || transition === "all 0s ease 0s" || transition === "none") continue;

        if (transition.startsWith("all ") || transition.includes(", all ")) {
          hasTransitionAll = true;
        }

        const durationMatch = transition.match(/(\d+(?:\.\d+)?)s/);
        if (durationMatch) {
          const ms = parseFloat(durationMatch[1]!) * 1000;
          if (ms > 500) hasLongTransition = true;
        }
      }

      return { subtle: !hasTransitionAll && !hasLongTransition, hasTransitionAll, hasLongTransition };
    });

    const passed = data.subtle;
    checkResults.push({
      id: "design-subtle-animations",
      category: DESIGN_CATEGORY,
      name: "Subtle Animations",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : (data.hasTransitionAll ? "Avoid 'transition: all'. " : "") + (data.hasLongTransition ? "Keep transitions <= 500ms." : ""),
    });
    if (!passed) {
      violations.push({
        id: `design-animations-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "low",
        rule: "animation-quality",
        message: (data.hasTransitionAll ? "Found 'transition: all' (lazy pattern). " : "") +
          (data.hasLongTransition ? "Found transitions > 500ms (feels sluggish)." : ""),
        url,
        help: "Specify exact properties to transition (e.g., opacity 200ms, transform 200ms). Keep durations 150-500ms.",
      });
    }
  } catch {
    checkResults.push({ id: "design-subtle-animations", category: DESIGN_CATEGORY, name: "Subtle Animations", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 11. No layout shift (+3pts) ───────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      // Check for images without explicit width/height (common CLS cause)
      const images = Array.from(document.querySelectorAll("img"));
      let noSizeCount = 0;
      for (const img of images.slice(0, 30)) {
        if (!img.hasAttribute("width") && !img.hasAttribute("height")) {
          const styles = window.getComputedStyle(img);
          if (styles.width === "auto" || styles.height === "auto" || (!styles.aspectRatio || styles.aspectRatio === "auto")) {
            noSizeCount++;
          }
        }
      }
      return { stable: noSizeCount === 0, noSizeCount };
    });

    const passed = data.stable;
    checkResults.push({
      id: "design-no-layout-shift",
      category: DESIGN_CATEGORY,
      name: "No Layout Shift",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : `${data.noSizeCount} image(s) without explicit dimensions may cause layout shift. Add width/height attributes.`,
    });
    if (!passed) {
      violations.push({
        id: `design-layout-shift-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "medium",
        rule: "layout-shift-risk",
        message: `${data.noSizeCount} image(s) without explicit width/height attributes may cause Cumulative Layout Shift.`,
        url,
        help: "Add width and height attributes to <img> tags, or use CSS aspect-ratio to reserve space before images load.",
      });
    }
  } catch {
    checkResults.push({ id: "design-no-layout-shift", category: DESIGN_CATEGORY, name: "No Layout Shift", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 12. Consistent icon style (+3pts) ──────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const libraries: string[] = [];
      const allRefs = Array.from(document.querySelectorAll("link[href], script[src]"))
        .map((el) => (el.getAttribute("href") || el.getAttribute("src") || "").toLowerCase())
        .join(" ");

      if (allRefs.includes("font-awesome") || allRefs.includes("fontawesome")) libraries.push("Font Awesome");
      if (allRefs.includes("material-icons") || allRefs.includes("material+icons")) libraries.push("Material Icons");
      if (allRefs.includes("lucide")) libraries.push("Lucide");
      if (allRefs.includes("heroicons")) libraries.push("Heroicons");
      if (allRefs.includes("bootstrap-icons")) libraries.push("Bootstrap Icons");
      if (allRefs.includes("feather")) libraries.push("Feather");
      if (allRefs.includes("phosphor")) libraries.push("Phosphor");
      if (allRefs.includes("tabler")) libraries.push("Tabler");

      if (document.querySelector(".fa, .fas, .far, .fab, .fa-solid, .fa-regular")) {
        if (!libraries.includes("Font Awesome")) libraries.push("Font Awesome");
      }
      if (document.querySelector(".material-icons, .material-symbols-outlined")) {
        if (!libraries.includes("Material Icons")) libraries.push("Material Icons");
      }

      return { libraries, count: libraries.length };
    });

    const passed = data.count <= 1;
    checkResults.push({
      id: "design-consistent-icons",
      category: DESIGN_CATEGORY,
      name: "Consistent Icon Style",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : `Using ${data.count} icon libraries (${data.libraries.join(", ")}). Stick to one.`,
    });
    if (!passed) {
      violations.push({
        id: `design-icons-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "medium",
        rule: "multiple-icon-libraries",
        message: `Multiple icon libraries: ${data.libraries.join(", ")}. Creates visual inconsistency.`,
        url,
        help: "Choose a single icon library and use it consistently. Remove unused icon imports.",
      });
    }
  } catch {
    checkResults.push({ id: "design-consistent-icons", category: DESIGN_CATEGORY, name: "Consistent Icon Style", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 13. Logo is high quality (+5pts) ──────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      // Look for logo by common selectors
      const logoSelectors = [
        "[class*='logo']", "[class*='Logo']",
        "[id*='logo']", "[id*='Logo']",
        "header img:first-of-type",
        "nav img:first-of-type",
        "a[href='/'] img", "a[href='./'] img",
      ];
      let logo: Element | null = null;
      for (const sel of logoSelectors) {
        logo = document.querySelector(sel);
        if (logo) break;
      }
      if (!logo) return { found: false };

      // SVG logos are always high quality
      if (logo.tagName === "SVG" || logo.tagName === "svg" || logo.querySelector("svg")) {
        return { found: true, isSvg: true, highQuality: true };
      }

      // Check img dimensions
      if (logo.tagName === "IMG") {
        const img = logo as HTMLImageElement;
        return {
          found: true,
          isSvg: false,
          highQuality: img.naturalWidth >= 64 && img.naturalHeight >= 64,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        };
      }

      return { found: true, isSvg: false, highQuality: true };
    });

    const passed = !data.found || (data.highQuality ?? false);
    checkResults.push({
      id: "design-logo-quality",
      category: DESIGN_CATEGORY,
      name: "Logo Is High Quality",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : data.found
        ? `Logo image is only ${data.naturalWidth}x${data.naturalHeight}px. Use SVG or an image >= 64px for crisp display.`
        : "No logo element found. Add a high-quality logo (SVG preferred).",
    });
    if (!passed) {
      violations.push({
        id: `design-logo-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "high",
        rule: "low-quality-logo",
        message: data.found
          ? `Logo is low resolution (${data.naturalWidth}x${data.naturalHeight}px). Use SVG or >= 64px.`
          : "No logo detected in header/nav.",
        url,
        help: "Use an SVG logo for perfect scaling, or provide a high-resolution image (>= 128px recommended).",
      });
    }
  } catch {
    checkResults.push({ id: "design-logo-quality", category: DESIGN_CATEGORY, name: "Logo Is High Quality", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 14. Whitespace is intentional (+5pts) ─────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const sections = document.querySelectorAll("section, main > div, article, .container");
      if (sections.length === 0) return { hasSections: false, goodPadding: true };
      let goodCount = 0;
      for (const section of Array.from(sections).slice(0, 20)) {
        const styles = window.getComputedStyle(section);
        const pt = parseFloat(styles.paddingTop);
        const pb = parseFloat(styles.paddingBottom);
        if (pt >= 32 || pb >= 32) goodCount++;
      }
      return { hasSections: true, goodPadding: goodCount > 0, goodCount, total: Math.min(sections.length, 20) };
    });

    const passed = !data.hasSections || data.goodPadding;
    checkResults.push({
      id: "design-whitespace",
      category: DESIGN_CATEGORY,
      name: "Whitespace Is Intentional",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : "Sections lack adequate padding (>= 32px). Add generous whitespace between content sections.",
    });
    if (!passed) {
      violations.push({
        id: `design-whitespace-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "medium",
        rule: "insufficient-whitespace",
        message: "No content sections have >= 32px padding. Content feels cramped.",
        url,
        help: "Add >= 32px vertical padding to sections. Generous whitespace improves readability and visual hierarchy.",
      });
    }
  } catch {
    checkResults.push({ id: "design-whitespace", category: DESIGN_CATEGORY, name: "Whitespace Is Intentional", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 15. Card/container contrast (+3pts) ────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const body = document.body;
      if (!body) return { checked: false };
      const bgColor = window.getComputedStyle(body).backgroundColor;
      const cards = document.querySelectorAll(
        "[class*='card'], [class*='Card'], article, [role='article'], .panel, .tile"
      );
      if (cards.length === 0) return { checked: true, indistinguishable: 0, total: 0 };
      let indistinguishable = 0;
      for (const card of Array.from(cards).slice(0, 20)) {
        const cardBg = window.getComputedStyle(card).backgroundColor;
        if (cardBg === bgColor && cardBg !== "rgba(0, 0, 0, 0)" && cardBg !== "transparent") {
          indistinguishable++;
        }
      }
      return { checked: true, indistinguishable, total: cards.length };
    });

    const passed = !data.checked || (data.indistinguishable ?? 0) === 0;
    checkResults.push({
      id: "design-card-contrast",
      category: DESIGN_CATEGORY,
      name: "Card/Container Contrast",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : `${data.indistinguishable} card(s) have same background as page. Add border, shadow, or different bg color.`,
    });
    if (!passed) {
      violations.push({
        id: `design-card-contrast-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "low",
        rule: "card-background-indistinguishable",
        message: `${data.indistinguishable} of ${data.total} card(s) have same background as page.`,
        url,
        help: "Use a different background color, border, or shadow on cards to separate them from the page.",
      });
    }
  } catch {
    checkResults.push({ id: "design-card-contrast", category: DESIGN_CATEGORY, name: "Card/Container Contrast", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 16. Color contrast accessible (+5pts) ─────────────────────────────
  try {
    const data = await page.evaluate(() => {
      function luminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map((c) => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
      }

      function parseColor(color: string): [number, number, number] | null {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        return [parseInt(match[1]!), parseInt(match[2]!), parseInt(match[3]!)];
      }

      function contrastRatio(l1: number, l2: number): number {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      const textElements = document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, span, a, li, td, th, label");
      let failCount = 0;
      let checkCount = 0;

      for (const el of Array.from(textElements).slice(0, 50)) {
        const styles = window.getComputedStyle(el);
        const fg = parseColor(styles.color);
        const bg = parseColor(styles.backgroundColor);
        if (!fg || !bg) continue;
        // Skip transparent backgrounds
        if (styles.backgroundColor === "rgba(0, 0, 0, 0)" || styles.backgroundColor === "transparent") continue;

        checkCount++;
        const fgLum = luminance(fg[0], fg[1], fg[2]);
        const bgLum = luminance(bg[0], bg[1], bg[2]);
        const ratio = contrastRatio(fgLum, bgLum);
        const fontSize = parseFloat(styles.fontSize);
        const isBold = parseInt(styles.fontWeight) >= 700;
        const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && isBold);
        const minRatio = isLargeText ? 3 : 4.5;

        if (ratio < minRatio) failCount++;
      }

      return { failCount, checkCount, passRate: checkCount > 0 ? (checkCount - failCount) / checkCount : 1 };
    });

    const passed = data.passRate >= 0.8;
    checkResults.push({
      id: "design-color-contrast",
      category: DESIGN_CATEGORY,
      name: "Color Contrast Accessible",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : `${data.failCount} of ${data.checkCount} text elements fail WCAG AA contrast ratio (4.5:1).`,
    });
    if (!passed) {
      violations.push({
        id: `design-contrast-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "high",
        rule: "color-contrast-fail",
        message: `${data.failCount} text elements fail WCAG AA contrast ratio. ${Math.round(data.passRate * 100)}% pass rate.`,
        url,
        help: "Ensure text has >= 4.5:1 contrast ratio against its background (3:1 for large text >= 24px).",
      });
    }
  } catch {
    checkResults.push({ id: "design-color-contrast", category: DESIGN_CATEGORY, name: "Color Contrast Accessible", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 17. Consistent component styling (+3pts) ──────────────────────────
  try {
    const data = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button, [role='button'], input[type='submit']"));
      if (buttons.length < 2) return { consistent: true, families: 0 };
      const families = new Set<string>();
      for (const btn of buttons.slice(0, 20)) {
        const family = window.getComputedStyle(btn).fontFamily.split(",")[0]?.trim().replace(/['"]/g, "").toLowerCase() ?? "";
        if (family) families.add(family);
      }
      return { consistent: families.size <= 1, families: families.size };
    });

    const passed = data.consistent;
    checkResults.push({
      id: "design-component-consistency",
      category: DESIGN_CATEGORY,
      name: "Consistent Component Styling",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : `Buttons use ${data.families} different font families. Standardize to one.`,
    });
    if (!passed) {
      violations.push({
        id: `design-component-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "low",
        rule: "component-font-inconsistency",
        message: `Buttons use ${data.families} different font families. All buttons should share the same font.`,
        url,
        help: "Apply a consistent font-family to all button/CTA components via a shared CSS class.",
      });
    }
  } catch {
    checkResults.push({ id: "design-component-consistency", category: DESIGN_CATEGORY, name: "Consistent Component Styling", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 18. Professional imagery (+5pts) ──────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      if (images.length === 0) return { hasImages: false, professional: true };
      const placeholderIndicators = [
        "placeholder", "lorem", "picsum", "unsplash.it", "placekitten",
        "placehold", "dummyimage", "fakeimg", "via.placeholder",
        "lorempixel", "placecage", "fillmurray",
      ];
      let placeholderCount = 0;
      for (const img of images.slice(0, 50)) {
        const src = (img.src || "").toLowerCase();
        const alt = (img.alt || "").toLowerCase();
        for (const indicator of placeholderIndicators) {
          if (src.includes(indicator) || alt.includes(indicator)) {
            placeholderCount++;
            break;
          }
        }
      }
      return { hasImages: true, professional: placeholderCount === 0, placeholderCount };
    });

    const passed = !data.hasImages || data.professional;
    checkResults.push({
      id: "design-professional-imagery",
      category: DESIGN_CATEGORY,
      name: "Professional Imagery",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : `Found ${data.placeholderCount} placeholder/stock image(s). Replace with professional, relevant imagery.`,
    });
    if (!passed) {
      violations.push({
        id: `design-imagery-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "high",
        rule: "placeholder-images",
        message: `Found ${data.placeholderCount} placeholder/stock indicator image(s).`,
        url,
        help: "Replace placeholder images with professional, relevant imagery that supports your brand.",
      });
    }
  } catch {
    checkResults.push({ id: "design-professional-imagery", category: DESIGN_CATEGORY, name: "Professional Imagery", passed: false, points: 0, maxPoints: 5 });
  }

  // ── 19. Dark mode support (+3pts) ─────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
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
            continue;
          }
          if (hasMediaQuery) break;
        }
      } catch {
        // Stylesheet access failed
      }

      const hasDarkClass =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark") ||
        !!document.querySelector("[data-theme]") ||
        !!document.querySelector("[data-mode]");

      return { supported: hasMediaQuery || hasDarkClass };
    });

    const passed = data.supported;
    checkResults.push({
      id: "design-dark-mode",
      category: DESIGN_CATEGORY,
      name: "Dark Mode Support",
      passed,
      points: passed ? 3 : 0,
      maxPoints: 3,
      howToFix: passed ? undefined : "Add dark mode support via CSS prefers-color-scheme media query or a class-based toggle.",
    });
    if (!passed) {
      violations.push({
        id: `design-dark-mode-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "info",
        rule: "no-dark-mode",
        message: "No dark mode support detected.",
        url,
        help: "Add prefers-color-scheme media query or a class-based dark mode toggle (e.g., Tailwind's 'dark' class).",
      });
    }
  } catch {
    checkResults.push({ id: "design-dark-mode", category: DESIGN_CATEGORY, name: "Dark Mode Support", passed: false, points: 0, maxPoints: 3 });
  }

  // ── 20. Favicon is custom (+5pts) ─────────────────────────────────────
  try {
    const data = await page.evaluate(() => {
      const faviconLink = document.querySelector(
        'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
      );
      if (!faviconLink) return { hasFavicon: false, isCustom: false };

      const href = (faviconLink.getAttribute("href") ?? "").toLowerCase();
      const defaultFavicons = [
        "favicon.ico", "/favicon.ico",
        "data:,", // empty data URI
      ];
      // Check for framework default favicons
      const frameworkDefaults = [
        "vite.svg", "/vite.svg",
        "next.svg", "/next.svg",
        "react.svg", "/react.svg",
        "angular.svg", "/angular.svg",
        "nuxt.svg", "/nuxt.svg",
      ];
      const isFrameworkDefault = frameworkDefaults.some((d) => href.includes(d));

      return { hasFavicon: true, isCustom: !isFrameworkDefault, href };
    });

    const passed = data.hasFavicon && data.isCustom;
    checkResults.push({
      id: "design-custom-favicon",
      category: DESIGN_CATEGORY,
      name: "Favicon Is Custom",
      passed,
      points: passed ? 5 : 0,
      maxPoints: 5,
      howToFix: passed ? undefined : data.hasFavicon
        ? `Favicon "${data.href}" appears to be a framework default. Add a custom favicon.`
        : "No favicon detected. Add a custom <link rel='icon'> in the <head>.",
    });
    if (!passed) {
      violations.push({
        id: `design-favicon-${randomId()}`,
        category: DESIGN_CATEGORY,
        severity: "high",
        rule: "default-favicon",
        message: data.hasFavicon
          ? `Favicon "${data.href}" is a framework default.`
          : "No favicon detected.",
        url,
        help: "Add a custom favicon: <link rel=\"icon\" href=\"/favicon.ico\">. Also add apple-touch-icon for mobile.",
      });
    }
  } catch {
    checkResults.push({ id: "design-custom-favicon", category: DESIGN_CATEGORY, name: "Favicon Is Custom", passed: false, points: 0, maxPoints: 5 });
  }

  return { violations, checkResults, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
