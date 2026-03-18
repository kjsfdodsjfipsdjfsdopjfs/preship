import type { Page } from "puppeteer-core";
import type { Violation } from "@preship/shared";

/**
 * Result from mobile-friendliness checks including violations and total check count.
 */
export interface MobileCheckResult {
  violations: Violation[];
  totalChecks: number;
}

/** Mobile viewport dimensions (iPhone 13/14 equivalent) */
const MOBILE_VIEWPORT = { width: 375, height: 812 };

/**
 * Run comprehensive mobile-friendliness checks against a page.
 *
 * Sets the viewport to mobile dimensions (375x812) and checks for:
 * - Viewport meta tag
 * - Body font-size >= 16px
 * - Touch targets >= 44x44px
 * - No horizontal scroll / content overflow
 * - Responsive images (srcset or max-width)
 * - Media queries present in stylesheets
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns MobileCheckResult with violations and total check count
 */
export async function runMobileChecks(
  page: Page,
  url: string
): Promise<MobileCheckResult> {
  const violations: Violation[] = [];
  const TOTAL_CHECKS = 6;

  try {
    // Set mobile viewport
    await page.setViewport({
      width: MOBILE_VIEWPORT.width,
      height: MOBILE_VIEWPORT.height,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    // Wait for layout to settle after viewport change
    await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

    const mobileData = await page.evaluate((viewportWidth) => {
      // 1. Viewport meta tag
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const viewportContent = viewportMeta?.getAttribute("content") ?? "";

      // 2. Body font size
      const body = document.body;
      const bodyStyles = body ? window.getComputedStyle(body) : null;
      const bodyFontSize = bodyStyles ? parseFloat(bodyStyles.fontSize) : 0;

      // 3. Touch targets - check interactive elements
      const interactiveSelectors = "a, button, input, select, textarea, [role='button'], [tabindex]";
      const interactiveElements = Array.from(document.querySelectorAll(interactiveSelectors));
      const smallTouchTargets: { html: string; width: number; height: number }[] = [];

      for (const el of interactiveElements) {
        const rect = el.getBoundingClientRect();
        // Skip hidden or zero-size elements
        if (rect.width === 0 || rect.height === 0) continue;
        // Skip elements that are very far off-screen
        if (rect.top > 5000) continue;

        if (rect.width < 44 || rect.height < 44) {
          // Only report first 10
          if (smallTouchTargets.length < 10) {
            smallTouchTargets.push({
              html: el.outerHTML.substring(0, 200),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        }
      }

      // 4. Horizontal scroll detection
      const documentWidth = Math.max(
        document.documentElement.scrollWidth,
        document.body?.scrollWidth ?? 0
      );
      const hasHorizontalScroll = documentWidth > viewportWidth + 5; // 5px tolerance

      // Find elements causing overflow
      const overflowingElements: { html: string; width: number }[] = [];
      if (hasHorizontalScroll) {
        const allElements = document.querySelectorAll("*");
        for (const el of Array.from(allElements).slice(0, 500)) {
          const rect = el.getBoundingClientRect();
          if (rect.right > viewportWidth + 5 && rect.width > viewportWidth) {
            if (overflowingElements.length < 5) {
              overflowingElements.push({
                html: el.outerHTML.substring(0, 200),
                width: Math.round(rect.width),
              });
            }
          }
        }
      }

      // 5. Responsive images
      const images = Array.from(document.querySelectorAll("img"));
      const nonResponsiveImages: { src: string; html: string }[] = [];
      for (const img of images) {
        const hasSrcset = !!img.srcset || !!img.getAttribute("srcset");
        const hasSizes = !!img.sizes || !!img.getAttribute("sizes");
        const style = window.getComputedStyle(img);
        const hasMaxWidth = style.maxWidth === "100%" || style.maxWidth !== "none";
        const hasWidthPercent = img.style.width?.includes("%");
        const isPicture = img.closest("picture") !== null;

        if (!hasSrcset && !hasSizes && !hasMaxWidth && !hasWidthPercent && !isPicture) {
          const rect = img.getBoundingClientRect();
          // Only flag visible images larger than icons
          if (rect.width > 50 && rect.height > 50 && nonResponsiveImages.length < 10) {
            nonResponsiveImages.push({
              src: (img.src || "").substring(0, 200),
              html: img.outerHTML.substring(0, 200),
            });
          }
        }
      }

      // 6. Media queries present
      const stylesheets = Array.from(document.styleSheets);
      let hasMediaQueries = false;
      try {
        for (const sheet of stylesheets) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            for (const rule of Array.from(rules)) {
              if (rule instanceof CSSMediaRule) {
                const media = rule.conditionText || rule.media?.mediaText || "";
                if (media.includes("max-width") || media.includes("min-width")) {
                  hasMediaQueries = true;
                  break;
                }
              }
            }
          } catch {
            // Cross-origin stylesheets throw, skip them (they likely have their own responsive rules)
            continue;
          }
          if (hasMediaQueries) break;
        }
      } catch {
        // If we can't access stylesheets, don't flag it
        hasMediaQueries = true;
      }

      return {
        viewportContent,
        bodyFontSize,
        smallTouchTargets,
        smallTouchTargetCount: interactiveElements.filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
        }).length,
        hasHorizontalScroll,
        overflowingElements,
        documentWidth,
        nonResponsiveImages,
        hasMediaQueries,
      };
    }, MOBILE_VIEWPORT.width);

    // 1. Viewport meta tag
    if (!mobileData.viewportContent) {
      violations.push({
        id: `mobile-viewport-missing-${randomId()}`,
        category: "mobile",
        severity: "critical",
        rule: "viewport-meta-missing",
        message: "Page is missing a viewport meta tag. The page will not render correctly on mobile devices.",
        url,
        help: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> to the <head>.",
        helpUrl: "https://web.dev/viewport/",
      });
    } else {
      const hasWidthDeviceWidth = mobileData.viewportContent.includes("width=device-width");
      if (!hasWidthDeviceWidth) {
        violations.push({
          id: `mobile-viewport-width-${randomId()}`,
          category: "mobile",
          severity: "high",
          rule: "viewport-width-missing",
          message: "Viewport meta tag does not include width=device-width. Mobile rendering may be incorrect.",
          url,
          help: "Set width=device-width in the viewport meta tag for proper mobile scaling.",
        });
      }
    }

    // 2. Font size check
    if (mobileData.bodyFontSize > 0 && mobileData.bodyFontSize < 16) {
      violations.push({
        id: `mobile-font-size-${randomId()}`,
        category: "mobile",
        severity: "medium",
        rule: "font-size-too-small",
        message: `Body font-size is ${mobileData.bodyFontSize}px. Minimum recommended size is 16px for mobile readability.`,
        url,
        help: "Set the base font-size to at least 16px to prevent browser zoom on mobile devices.",
        helpUrl: "https://web.dev/font-size/",
      });
    }

    // 3. Touch target size check
    if (mobileData.smallTouchTargetCount > 0) {
      const severity = mobileData.smallTouchTargetCount > 10 ? "high" : "medium";
      violations.push({
        id: `mobile-touch-targets-${randomId()}`,
        category: "mobile",
        severity,
        rule: "touch-target-too-small",
        message: `Found ${mobileData.smallTouchTargetCount} interactive element(s) smaller than 44x44px minimum touch target size.`,
        element: mobileData.smallTouchTargets
          .map((t) => `${t.html} (${t.width}x${t.height}px)`)
          .join("\n")
          .substring(0, 1000),
        url,
        help: "Ensure all interactive elements (buttons, links, inputs) are at least 44x44px for comfortable touch interaction.",
        helpUrl: "https://web.dev/accessible-tap-targets/",
      });
    }

    // 4. Horizontal scroll check
    if (mobileData.hasHorizontalScroll) {
      violations.push({
        id: `mobile-horizontal-scroll-${randomId()}`,
        category: "mobile",
        severity: "high",
        rule: "horizontal-scroll",
        message: `Page content (${mobileData.documentWidth}px) exceeds mobile viewport width (${MOBILE_VIEWPORT.width}px), causing horizontal scrolling.`,
        element: mobileData.overflowingElements
          .map((e) => `${e.html} (width: ${e.width}px)`)
          .join("\n")
          .substring(0, 1000),
        url,
        help: "Ensure all content fits within the viewport width. Use max-width: 100%, overflow-x: hidden, or responsive layouts.",
        helpUrl: "https://web.dev/responsive-web-design-basics/",
      });
    }

    // 5. Responsive images check
    if (mobileData.nonResponsiveImages.length > 0) {
      violations.push({
        id: `mobile-images-not-responsive-${randomId()}`,
        category: "mobile",
        severity: "medium",
        rule: "images-not-responsive",
        message: `Found ${mobileData.nonResponsiveImages.length} image(s) that may not scale properly on mobile devices.`,
        element: mobileData.nonResponsiveImages
          .map((i) => i.html)
          .join("\n")
          .substring(0, 1000),
        url,
        help: "Use srcset, sizes attributes, <picture> element, or CSS max-width: 100% for responsive images.",
        helpUrl: "https://web.dev/serve-responsive-images/",
      });
    }

    // 6. Media queries check
    if (!mobileData.hasMediaQueries) {
      violations.push({
        id: `mobile-no-media-queries-${randomId()}`,
        category: "mobile",
        severity: "high",
        rule: "no-responsive-breakpoints",
        message: "No responsive media queries detected. The page may not adapt to different screen sizes.",
        url,
        help: "Add CSS media queries with breakpoints (e.g., @media (max-width: 768px)) to create responsive layouts.",
        helpUrl: "https://web.dev/responsive-web-design-basics/#media-queries",
      });
    }

    return { violations, totalChecks: TOTAL_CHECKS };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mobile] Check failed: ${message}`);

    return {
      violations: [
        {
          id: `mobile-error-${randomId()}`,
          category: "mobile",
          severity: "high",
          rule: "mobile-check-failed",
          message: `Mobile check could not complete: ${message}`,
          url,
          help: "Ensure the page loads correctly and try again.",
        },
      ],
      totalChecks: TOTAL_CHECKS,
    };
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
