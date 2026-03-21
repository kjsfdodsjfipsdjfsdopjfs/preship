import type { Page } from "puppeteer-core";
import type { Violation } from "@preship/shared";

/**
 * Result from human appeal checks including violations and total check count.
 */
export interface HumanAppealCheckResult {
  violations: Violation[];
  totalChecks: number;
}

/**
 * Run comprehensive human appeal checks against a page.
 *
 * Checks include:
 * - Above-the-fold meaningful content
 * - Trust signals (testimonials, logos, badges)
 * - Social proof (user counts, ratings)
 * - CTA clarity and quantity
 * - CTA text quality
 * - Favicon presence
 * - Logo in header/nav
 * - Footer completeness
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns HumanAppealCheckResult with violations and total check count
 */
export async function runHumanAppealChecks(
  page: Page,
  url: string
): Promise<HumanAppealCheckResult> {
  const violations: Violation[] = [];
  const TOTAL_CHECKS = 8;

  // 1. Check above-the-fold content
  try {
    const hasMeaningfulContent = await page.evaluate(() => {
      // Look for text content outside of nav/header in the first 800px
      const elements = document.querySelectorAll("h1, h2, p, [class*='hero'], [class*='headline']");
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const text = (el.textContent || "").trim();
        // Element is above the fold and has meaningful text (not just nav items)
        if (rect.top < 800 && text.length > 20 && el.closest("nav") === null) {
          return true;
        }
      }
      return false;
    });

    if (!hasMeaningfulContent) {
      violations.push({
        id: `human-appeal-no-atf-content-${randomId()}`,
        category: "human_appeal",
        severity: "high",
        rule: "no-above-fold-content",
        message: "No meaningful text content found above the fold (first 800px). Visitors may not understand your value proposition.",
        url,
        help: "Add a clear headline and supporting text in the hero section so visitors immediately understand what your product does.",
      });
    }
  } catch (error) {
    console.error(`[human-appeal] Above-the-fold check failed: ${errorMessage(error)}`);
  }

  // 2. Check trust signals (testimonials, customer logos, security badges)
  try {
    const trustSignals = await page.evaluate(() => {
      const body = document.body?.innerHTML?.toLowerCase() ?? "";
      const hasTestimonials =
        /testimonial|review|what customers say|what people say|customer stories/i.test(body);

      // Look for logo/partner sections
      const logoSections = document.querySelectorAll(
        '[class*="logo"], [class*="partner"], [class*="trusted"], [class*="client"], [class*="brand"]'
      );
      const hasCustomerLogos = logoSections.length > 0 &&
        Array.from(logoSections).some((section) => section.querySelectorAll("img, svg").length >= 2);

      // Look for security badges
      const hasBadges = document.querySelectorAll(
        '[class*="badge"], [class*="seal"], [class*="certified"], [alt*="secure"], [alt*="verified"]'
      ).length > 0;

      return { hasTestimonials, hasCustomerLogos, hasBadges };
    });

    if (!trustSignals.hasTestimonials && !trustSignals.hasCustomerLogos && !trustSignals.hasBadges) {
      violations.push({
        id: `human-appeal-no-trust-signals-${randomId()}`,
        category: "human_appeal",
        severity: "medium",
        rule: "no-trust-signals",
        message: "No trust signals found (testimonials, customer logos, or security badges).",
        url,
        help: "Add social proof elements like customer testimonials, partner logos, or trust badges to build credibility.",
      });
    }
  } catch (error) {
    console.error(`[human-appeal] Trust signals check failed: ${errorMessage(error)}`);
  }

  // 3. Check social proof (user counts, ratings)
  try {
    const hasSocialProof = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      // Match patterns like "10,000+ users", "5-star", "4.9 rating", "1M downloads"
      const socialProofPatterns = [
        /\d[\d,]*\+?\s*(users|customers|companies|teams|downloads|installs)/i,
        /\d+(\.\d+)?\s*(star|stars|rating)/i,
        /trusted by\s+\d/i,
        /used by\s+\d/i,
        /join\s+\d[\d,]*\+?\s*/i,
      ];
      return socialProofPatterns.some((pattern) => pattern.test(bodyText));
    });

    if (!hasSocialProof) {
      violations.push({
        id: `human-appeal-no-social-proof-${randomId()}`,
        category: "human_appeal",
        severity: "low",
        rule: "no-social-proof",
        message: "No social proof detected (user counts, ratings, or usage stats).",
        url,
        help: "Add concrete numbers like user counts, star ratings, or download stats to demonstrate traction.",
      });
    }
  } catch (error) {
    console.error(`[human-appeal] Social proof check failed: ${errorMessage(error)}`);
  }

  // 4. Check CTA clarity — count CTAs above the fold
  try {
    const ctaCount = await page.evaluate(() => {
      const ctaSelectors = [
        'a[class*="cta"]', 'a[class*="btn"]', 'a[class*="button"]',
        'button[class*="cta"]', 'button[class*="btn"]', 'button[class*="primary"]',
        'a[class*="primary"]', '[role="button"]',
      ];
      const allCTAs = document.querySelectorAll(ctaSelectors.join(", "));
      let aboveFoldCount = 0;
      for (const el of allCTAs) {
        const rect = el.getBoundingClientRect();
        const text = (el.textContent || "").trim();
        // Count visible CTAs above the fold with actual text
        if (rect.top < 800 && rect.height > 0 && text.length > 0) {
          aboveFoldCount++;
        }
      }
      return aboveFoldCount;
    });

    if (ctaCount === 0) {
      violations.push({
        id: `human-appeal-no-cta-${randomId()}`,
        category: "human_appeal",
        severity: "high",
        rule: "no-cta-above-fold",
        message: "No call-to-action button found above the fold.",
        url,
        help: "Add a clear, prominent CTA button in your hero section to guide visitors toward the desired action.",
      });
    } else if (ctaCount > 4) {
      violations.push({
        id: `human-appeal-too-many-ctas-${randomId()}`,
        category: "human_appeal",
        severity: "medium",
        rule: "too-many-ctas",
        message: `Found ${ctaCount} competing CTAs above the fold. Too many options can overwhelm visitors.`,
        url,
        help: "Reduce the number of CTAs above the fold to 1-3. Prioritize your primary action and make it visually dominant.",
      });
    }
  } catch (error) {
    console.error(`[human-appeal] CTA clarity check failed: ${errorMessage(error)}`);
  }

  // 5. Check CTA text quality
  try {
    const ctaTextIssue = await page.evaluate(() => {
      const ctaSelectors = [
        'a[class*="cta"]', 'a[class*="btn"]', 'a[class*="button"]',
        'button[class*="cta"]', 'button[class*="btn"]', 'button[class*="primary"]',
        'a[class*="primary"]',
      ];
      const allCTAs = document.querySelectorAll(ctaSelectors.join(", "));
      const genericTexts = /^(click here|submit|learn more|read more|go|press here|enter)$/i;

      for (const el of allCTAs) {
        const rect = el.getBoundingClientRect();
        const text = (el.textContent || "").trim();
        // Check the first visible CTA above the fold
        if (rect.top < 800 && rect.height > 0 && text.length > 0) {
          if (genericTexts.test(text)) {
            return text;
          }
          return null; // First CTA has good text
        }
      }
      return null;
    });

    if (ctaTextIssue) {
      violations.push({
        id: `human-appeal-generic-cta-${randomId()}`,
        category: "human_appeal",
        severity: "medium",
        rule: "generic-cta-text",
        message: `Primary CTA uses generic text "${ctaTextIssue}". This doesn't communicate value.`,
        url,
        help: "Use action-oriented, specific CTA text like 'Start Free Trial', 'Get Started', or 'See Pricing' instead of generic labels.",
      });
    }
  } catch (error) {
    console.error(`[human-appeal] CTA text quality check failed: ${errorMessage(error)}`);
  }

  // 6. Check favicon
  try {
    const hasFavicon = await page.evaluate(() => {
      const faviconSelectors = [
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel="apple-touch-icon"]',
        'link[rel="apple-touch-icon-precomposed"]',
      ];
      return faviconSelectors.some((sel) => document.querySelector(sel) !== null);
    });

    if (!hasFavicon) {
      violations.push({
        id: `human-appeal-no-favicon-${randomId()}`,
        category: "human_appeal",
        severity: "medium",
        rule: "no-favicon",
        message: "No favicon link tag found. The page may show a generic browser icon in tabs.",
        url,
        help: "Add a favicon to make your site look professional in browser tabs and bookmarks. Use <link rel='icon' href='/favicon.ico'>.",
        helpUrl: "https://web.dev/articles/themed-html",
      });
    }
  } catch (error) {
    console.error(`[human-appeal] Favicon check failed: ${errorMessage(error)}`);
  }

  // 7. Check for logo in header/nav
  try {
    const hasLogoInHeader = await page.evaluate(() => {
      const headerNav = document.querySelector("header, nav, [role='banner']");
      if (!headerNav) return false;
      const images = headerNav.querySelectorAll("img, svg");
      // Check if any image/svg looks like a logo (in the header area, reasonably sized)
      for (const img of images) {
        const rect = img.getBoundingClientRect();
        if (rect.width > 16 && rect.height > 16) {
          return true;
        }
      }
      return false;
    });

    if (!hasLogoInHeader) {
      violations.push({
        id: `human-appeal-no-header-logo-${randomId()}`,
        category: "human_appeal",
        severity: "low",
        rule: "no-header-logo",
        message: "No logo image or SVG found in the header/nav area.",
        url,
        help: "Add your logo to the header so visitors can immediately identify your brand.",
      });
    }
  } catch (error) {
    console.error(`[human-appeal] Logo in header check failed: ${errorMessage(error)}`);
  }

  // 8. Check footer completeness
  try {
    const footerInfo = await page.evaluate(() => {
      const footer = document.querySelector("footer, [role='contentinfo']");
      if (!footer) return { exists: false, linkGroupCount: 0 };

      const links = footer.querySelectorAll("a");
      const linkTexts = Array.from(links).map((a) => (a.textContent || "").trim().toLowerCase());
      const hrefs = Array.from(links).map((a) => (a.getAttribute("href") || "").toLowerCase());

      // Check for social links
      const hasSocialLinks = hrefs.some((h) =>
        /twitter\.com|x\.com|facebook\.com|linkedin\.com|instagram\.com|youtube\.com|github\.com/.test(h)
      );

      // Check for legal links
      const hasLegalLinks = linkTexts.some((t) =>
        /privacy|terms|legal|cookie|imprint|disclaimer/.test(t)
      );

      // Check for contact info
      const footerText = footer.textContent?.toLowerCase() ?? "";
      const hasContactInfo =
        linkTexts.some((t) => /contact|email|support/.test(t)) ||
        /contact|email|support|@/.test(footerText);

      let linkGroupCount = 0;
      if (hasSocialLinks) linkGroupCount++;
      if (hasLegalLinks) linkGroupCount++;
      if (hasContactInfo) linkGroupCount++;

      return { exists: true, linkGroupCount };
    });

    if (!footerInfo.exists) {
      violations.push({
        id: `human-appeal-no-footer-${randomId()}`,
        category: "human_appeal",
        severity: "medium",
        rule: "no-footer",
        message: "No footer element found on the page.",
        url,
        help: "Add a footer with social links, legal links, and contact information to build trust and professionalism.",
      });
    } else if (footerInfo.linkGroupCount < 3) {
      violations.push({
        id: `human-appeal-incomplete-footer-${randomId()}`,
        category: "human_appeal",
        severity: "low",
        rule: "incomplete-footer",
        message: `Footer is missing some expected content. Found ${footerInfo.linkGroupCount}/3 link groups (social, legal, contact).`,
        url,
        help: "A complete footer should include social media links, legal/privacy links, and contact information.",
      });
    }
  } catch (error) {
    console.error(`[human-appeal] Footer check failed: ${errorMessage(error)}`);
  }

  return { violations, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
