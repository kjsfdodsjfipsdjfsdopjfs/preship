import type { Page } from "puppeteer-core";
import type { Violation } from "@preship/shared";

/**
 * Result from SEO checks including violations and a 0-100 score.
 */
export interface SeoCheckResult {
  violations: Violation[];
  score: number;
  totalChecks: number;
}

/**
 * Run comprehensive SEO checks against a page.
 *
 * Checks include:
 * - Title tag (exists, length 30-60 chars)
 * - Meta description (exists, length 120-160 chars)
 * - H1 tag (exactly one)
 * - Canonical URL
 * - Robots meta tag
 * - Open Graph tags (og:title, og:description, og:image)
 * - Twitter card tags
 * - Structured data (JSON-LD)
 * - Lang attribute on <html>
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns SeoCheckResult with violations, score, and total check count
 */
export async function runSeoChecks(
  page: Page,
  url: string
): Promise<SeoCheckResult> {
  const violations: Violation[] = [];
  const TOTAL_CHECKS = 10;
  let passed = 0;

  try {
    const seoData = await page.evaluate(() => {
      // Title
      const titleEl = document.querySelector("title");
      const title = titleEl?.textContent?.trim() ?? "";

      // Meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      const description = metaDesc?.getAttribute("content")?.trim() ?? "";

      // H1 tags
      const h1Elements = document.querySelectorAll("h1");
      const h1Count = h1Elements.length;
      const h1Text = h1Elements[0]?.textContent?.trim().substring(0, 100) ?? "";

      // Canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      const canonicalHref = canonical?.getAttribute("href") ?? "";

      // Robots meta
      const robotsMeta = document.querySelector('meta[name="robots"]');
      const robotsContent = robotsMeta?.getAttribute("content") ?? "";

      // Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "";
      const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "";
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? "";

      // Twitter card tags
      const twitterCard = document.querySelector('meta[name="twitter:card"]')?.getAttribute("content") ?? "";
      const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ?? "";
      const twitterDescription = document.querySelector('meta[name="twitter:description"]')?.getAttribute("content") ?? "";

      // Structured data (JSON-LD)
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      const hasJsonLd = jsonLdScripts.length > 0;

      // Lang attribute
      const lang = document.documentElement.getAttribute("lang") ?? "";

      return {
        title,
        titleLength: title.length,
        description,
        descriptionLength: description.length,
        h1Count,
        h1Text,
        canonicalHref,
        robotsContent,
        ogTitle,
        ogDescription,
        ogImage,
        twitterCard,
        twitterTitle,
        twitterDescription,
        hasJsonLd,
        lang,
      };
    });

    // 1. Title tag check
    if (!seoData.title) {
      violations.push({
        id: `seo-title-missing-${randomId()}`,
        category: "seo",
        severity: "critical",
        rule: "title-missing",
        message: "Page is missing a <title> tag.",
        url,
        help: "Add a unique, descriptive <title> tag between 30-60 characters.",
        helpUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title",
      });
    } else if (seoData.titleLength < 30) {
      violations.push({
        id: `seo-title-short-${randomId()}`,
        category: "seo",
        severity: "medium",
        rule: "title-too-short",
        message: `Title tag is too short (${seoData.titleLength} chars). Recommended: 30-60 characters.`,
        url,
        help: "Expand the title to be more descriptive (30-60 characters for optimal SEO).",
      });
    } else if (seoData.titleLength > 60) {
      violations.push({
        id: `seo-title-long-${randomId()}`,
        category: "seo",
        severity: "low",
        rule: "title-too-long",
        message: `Title tag is too long (${seoData.titleLength} chars). Recommended: 30-60 characters.`,
        url,
        help: "Shorten the title to 60 characters or fewer to avoid truncation in search results.",
      });
    } else {
      passed++;
    }

    // 2. Meta description check
    if (!seoData.description) {
      violations.push({
        id: `seo-description-missing-${randomId()}`,
        category: "seo",
        severity: "high",
        rule: "meta-description-missing",
        message: "Page is missing a meta description.",
        url,
        help: "Add a <meta name=\"description\"> tag with 120-160 characters describing the page content.",
        helpUrl: "https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/The_head_metadata_in_HTML",
      });
    } else if (seoData.descriptionLength < 120) {
      violations.push({
        id: `seo-description-short-${randomId()}`,
        category: "seo",
        severity: "low",
        rule: "meta-description-too-short",
        message: `Meta description is too short (${seoData.descriptionLength} chars). Recommended: 120-160 characters.`,
        url,
        help: "Expand the meta description to at least 120 characters for better search result snippets.",
      });
    } else if (seoData.descriptionLength > 160) {
      violations.push({
        id: `seo-description-long-${randomId()}`,
        category: "seo",
        severity: "low",
        rule: "meta-description-too-long",
        message: `Meta description is too long (${seoData.descriptionLength} chars). Recommended: 120-160 characters.`,
        url,
        help: "Shorten the meta description to 160 characters or fewer to avoid truncation.",
      });
    } else {
      passed++;
    }

    // 3. H1 tag check
    if (seoData.h1Count === 0) {
      violations.push({
        id: `seo-h1-missing-${randomId()}`,
        category: "seo",
        severity: "high",
        rule: "h1-missing",
        message: "Page is missing an <h1> tag.",
        url,
        help: "Add exactly one <h1> tag that describes the primary topic of the page.",
      });
    } else if (seoData.h1Count > 1) {
      violations.push({
        id: `seo-h1-multiple-${randomId()}`,
        category: "seo",
        severity: "medium",
        rule: "h1-multiple",
        message: `Page has ${seoData.h1Count} <h1> tags. There should be exactly one.`,
        url,
        help: "Use only one <h1> tag per page. Use <h2>-<h6> for subheadings.",
      });
    } else {
      passed++;
    }

    // 4. Canonical URL check
    if (!seoData.canonicalHref) {
      violations.push({
        id: `seo-canonical-missing-${randomId()}`,
        category: "seo",
        severity: "medium",
        rule: "canonical-missing",
        message: "Page is missing a canonical URL.",
        url,
        help: "Add a <link rel=\"canonical\" href=\"...\"> tag to prevent duplicate content issues.",
        helpUrl: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
      });
    } else {
      passed++;
    }

    // 5. Robots meta tag check
    if (!seoData.robotsContent) {
      violations.push({
        id: `seo-robots-missing-${randomId()}`,
        category: "seo",
        severity: "low",
        rule: "robots-meta-missing",
        message: "Page is missing a robots meta tag. While not required, it provides explicit crawling instructions.",
        url,
        help: "Add a <meta name=\"robots\" content=\"index, follow\"> tag for explicit search engine instructions.",
      });
    } else {
      passed++;
    }

    // 6. Open Graph tags check
    const ogIssues: string[] = [];
    if (!seoData.ogTitle) ogIssues.push("og:title");
    if (!seoData.ogDescription) ogIssues.push("og:description");
    if (!seoData.ogImage) ogIssues.push("og:image");

    if (ogIssues.length > 0) {
      violations.push({
        id: `seo-og-missing-${randomId()}`,
        category: "seo",
        severity: ogIssues.length === 3 ? "high" : "medium",
        rule: "open-graph-incomplete",
        message: `Missing Open Graph tags: ${ogIssues.join(", ")}. Social media previews will be degraded.`,
        url,
        help: "Add og:title, og:description, and og:image meta tags for rich social media previews.",
        helpUrl: "https://ogp.me/",
      });
    } else {
      passed++;
    }

    // 7. Twitter card tags check
    if (!seoData.twitterCard) {
      violations.push({
        id: `seo-twitter-card-missing-${randomId()}`,
        category: "seo",
        severity: "low",
        rule: "twitter-card-missing",
        message: "Missing Twitter card meta tag. Twitter/X previews may not display correctly.",
        url,
        help: "Add <meta name=\"twitter:card\" content=\"summary_large_image\"> and related Twitter meta tags.",
        helpUrl: "https://developer.x.com/en/docs/twitter-for-websites/cards/overview/markup",
      });
    } else {
      passed++;
    }

    // 8. Structured data (JSON-LD) check
    if (!seoData.hasJsonLd) {
      violations.push({
        id: `seo-jsonld-missing-${randomId()}`,
        category: "seo",
        severity: "medium",
        rule: "structured-data-missing",
        message: "No JSON-LD structured data found. Rich search results will not be available.",
        url,
        help: "Add JSON-LD structured data (e.g., Organization, WebPage, Product) for enhanced search results.",
        helpUrl: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
      });
    } else {
      passed++;
    }

    // 9. Lang attribute check
    if (!seoData.lang) {
      violations.push({
        id: `seo-lang-missing-${randomId()}`,
        category: "seo",
        severity: "high",
        rule: "lang-attribute-missing",
        message: "The <html> element is missing a lang attribute. Search engines use this for language targeting.",
        url,
        help: "Add a lang attribute to the <html> element (e.g., lang=\"en\").",
      });
    } else {
      passed++;
    }

    // 10. Check for noindex (informational)
    if (seoData.robotsContent.toLowerCase().includes("noindex")) {
      violations.push({
        id: `seo-noindex-${randomId()}`,
        category: "seo",
        severity: "info",
        rule: "page-noindex",
        message: "Page has a noindex directive. It will not appear in search results.",
        url,
        help: "Remove the noindex directive if you want this page to be indexed by search engines.",
      });
    } else {
      passed++;
    }

    // Calculate score
    const score = Math.round((passed / TOTAL_CHECKS) * 100);

    return { violations, score, totalChecks: TOTAL_CHECKS };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[seo] Check failed: ${message}`);

    return {
      violations: [
        {
          id: `seo-error-${randomId()}`,
          category: "seo",
          severity: "high",
          rule: "seo-check-failed",
          message: `SEO check could not complete: ${message}`,
          url,
          help: "Ensure the page loads correctly and try again.",
        },
      ],
      score: 0,
      totalChecks: TOTAL_CHECKS,
    };
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
