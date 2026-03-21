import type { Page } from "puppeteer-core";
import type { Violation } from "@preship/shared";

/**
 * Result from growth potential checks including violations and total check count.
 */
export interface GrowthCheckResult {
  violations: Violation[];
  totalChecks: number;
}

/**
 * Run comprehensive growth potential checks against a page.
 *
 * Checks include:
 * - Share buttons presence
 * - Blog/content presence
 * - Newsletter signup
 * - Community links (Discord, Slack, etc.)
 * - Social media links count
 * - Sitemap availability
 * - RSS feed
 * - Referral/affiliate program
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns GrowthCheckResult with violations and total check count
 */
export async function runGrowthChecks(
  page: Page,
  url: string
): Promise<GrowthCheckResult> {
  const violations: Violation[] = [];
  const TOTAL_CHECKS = 8;

  // 1. Check for share buttons
  try {
    const hasShareButtons = await page.evaluate(() => {
      // Look for share-related elements
      const shareSelectors = [
        '[class*="share"]',
        '[id*="share"]',
        '[aria-label*="share"]',
        'a[href*="twitter.com/intent/tweet"]',
        'a[href*="x.com/intent"]',
        'a[href*="facebook.com/sharer"]',
        'a[href*="linkedin.com/sharing"]',
        'a[href*="reddit.com/submit"]',
        '[class*="copy-link"]',
        '[class*="copy-url"]',
      ];
      const shareElements = document.querySelectorAll(shareSelectors.join(", "));
      if (shareElements.length > 0) return true;

      // Also check for share text in buttons
      const buttons = Array.from(document.querySelectorAll("button, a"));
      return buttons.some((btn) => {
        const text = (btn.textContent || "").trim().toLowerCase();
        return text === "share" || text.includes("share on") || text.includes("copy link");
      });
    });

    if (!hasShareButtons) {
      violations.push({
        id: `growth-no-share-buttons-${randomId()}`,
        category: "growth",
        severity: "medium",
        rule: "no-share-buttons",
        message: "No social share buttons or sharing functionality found.",
        url,
        help: "Add share buttons (Twitter/X, LinkedIn, copy link) to make it easy for users to spread the word about your product.",
      });
    }
  } catch (error) {
    console.error(`[growth] Share buttons check failed: ${errorMessage(error)}`);
  }

  // 2. Check for blog presence
  try {
    const hasBlog = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const blogPatterns = /blog|articles|news|posts|journal/i;
      return links.some((link) => {
        const text = (link.textContent || "").trim();
        const href = link.getAttribute("href") || "";
        // Only match navigation-level links, not random mentions
        const isNavOrFooter = link.closest("nav, header, footer, [role='navigation'], [role='banner'], [role='contentinfo']") !== null;
        return isNavOrFooter && (blogPatterns.test(text) || blogPatterns.test(href));
      });
    });

    if (!hasBlog) {
      violations.push({
        id: `growth-no-blog-${randomId()}`,
        category: "growth",
        severity: "medium",
        rule: "no-blog-link",
        message: "No blog or articles link found in navigation. Content marketing drives organic growth.",
        url,
        help: "Add a blog to share insights, tutorials, and updates. This drives SEO traffic and establishes authority.",
      });
    }
  } catch (error) {
    console.error(`[growth] Blog check failed: ${errorMessage(error)}`);
  }

  // 3. Check for newsletter signup
  try {
    const hasNewsletter = await page.evaluate(() => {
      // Look for email inputs near newsletter-related text
      const emailInputs = Array.from(
        document.querySelectorAll('input[type="email"], input[placeholder*="email" i], input[name*="email" i]')
      );

      for (const input of emailInputs) {
        // Check nearby text for newsletter signals
        const parent = input.closest("form, section, div");
        if (parent) {
          const parentText = (parent.textContent || "").toLowerCase();
          if (
            parentText.includes("subscribe") ||
            parentText.includes("newsletter") ||
            parentText.includes("updates") ||
            parentText.includes("notify") ||
            parentText.includes("stay in the loop") ||
            parentText.includes("get notified")
          ) {
            return true;
          }
        }
      }

      // Also check for dedicated newsletter forms
      const newsletterSelectors = [
        '[class*="newsletter"]',
        '[id*="newsletter"]',
        '[class*="subscribe"]',
        '[id*="subscribe"]',
      ];
      return document.querySelectorAll(newsletterSelectors.join(", ")).length > 0;
    });

    // Newsletter is a strength — only note if missing, low severity
    if (!hasNewsletter) {
      violations.push({
        id: `growth-no-newsletter-${randomId()}`,
        category: "growth",
        severity: "low",
        rule: "no-newsletter-signup",
        message: "No newsletter or email signup form detected. Email is a powerful retention channel.",
        url,
        help: "Add an email signup form to capture leads and keep users engaged with product updates.",
      });
    }
  } catch (error) {
    console.error(`[growth] Newsletter check failed: ${errorMessage(error)}`);
  }

  // 4. Check for community links
  try {
    const hasCommunity = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const communityPatterns = /discord\.gg|discord\.com|join\.slack\.com|slack\.com\/join|github\.com|reddit\.com\/r\/|community\.|forum\./i;
      return links.some((link) => {
        const href = link.getAttribute("href") || "";
        return communityPatterns.test(href);
      });
    });

    if (!hasCommunity) {
      violations.push({
        id: `growth-no-community-${randomId()}`,
        category: "growth",
        severity: "low",
        rule: "no-community-links",
        message: "No community links found (Discord, Slack, GitHub, Reddit, forums).",
        url,
        help: "Create a community space where users can interact, get help, and share feedback. Discord and GitHub Discussions are popular options.",
      });
    }
  } catch (error) {
    console.error(`[growth] Community links check failed: ${errorMessage(error)}`);
  }

  // 5. Check social media links count
  try {
    const socialLinkCount = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const socialDomains = [
        /twitter\.com|x\.com/i,
        /linkedin\.com/i,
        /github\.com/i,
        /youtube\.com/i,
        /instagram\.com/i,
        /facebook\.com/i,
        /tiktok\.com/i,
        /mastodon/i,
      ];

      const foundDomains = new Set<number>();
      for (const link of links) {
        const href = link.getAttribute("href") || "";
        for (let i = 0; i < socialDomains.length; i++) {
          if (socialDomains[i].test(href)) {
            foundDomains.add(i);
          }
        }
      }
      return foundDomains.size;
    });

    if (socialLinkCount < 2) {
      violations.push({
        id: `growth-few-social-links-${randomId()}`,
        category: "growth",
        severity: "medium",
        rule: "insufficient-social-links",
        message: `Only ${socialLinkCount} social media platform link(s) found. More social presence increases discoverability.`,
        url,
        help: "Link to at least 2-3 active social profiles (e.g., Twitter/X, LinkedIn, GitHub) to build brand presence and trust.",
      });
    }
  } catch (error) {
    console.error(`[growth] Social media links check failed: ${errorMessage(error)}`);
  }

  // 6. Check for sitemap
  try {
    const hasSitemap = await page.evaluate(() => {
      // Check footer for sitemap link
      const links = Array.from(document.querySelectorAll("a"));
      const hasSitemapLink = links.some((link) => {
        const href = (link.getAttribute("href") || "").toLowerCase();
        const text = (link.textContent || "").trim().toLowerCase();
        return href.includes("sitemap") || text.includes("sitemap");
      });

      // Check for sitemap reference in meta or link tags
      const hasSitemapMeta = document.querySelector('link[rel="sitemap"]') !== null;

      return hasSitemapLink || hasSitemapMeta;
    });

    if (!hasSitemap) {
      // Also try fetching robots.txt for sitemap reference
      let sitemapInRobots = false;
      try {
        const parsedUrl = new URL(url);
        const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
        const response = await page.evaluate(async (robotsUrl: string) => {
          try {
            const res = await fetch(robotsUrl, { method: "GET" });
            if (res.ok) {
              const text = await res.text();
              return text.toLowerCase().includes("sitemap");
            }
          } catch {
            // Ignore fetch errors
          }
          return false;
        }, robotsUrl);
        sitemapInRobots = response;
      } catch {
        // Ignore errors checking robots.txt
      }

      if (!sitemapInRobots) {
        violations.push({
          id: `growth-no-sitemap-${randomId()}`,
          category: "growth",
          severity: "medium",
          rule: "no-sitemap",
          message: "No sitemap.xml reference found in page links or robots.txt.",
          url,
          help: "Create a sitemap.xml and reference it in your robots.txt. This helps search engines discover and index all your pages.",
          helpUrl: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap",
        });
      }
    }
  } catch (error) {
    console.error(`[growth] Sitemap check failed: ${errorMessage(error)}`);
  }

  // 7. Check for RSS feed
  try {
    const hasRSS = await page.evaluate(() => {
      const rssLink = document.querySelector(
        'link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]'
      );
      return rssLink !== null;
    });

    // RSS is a strength — low severity if missing
    if (!hasRSS) {
      violations.push({
        id: `growth-no-rss-${randomId()}`,
        category: "growth",
        severity: "low",
        rule: "no-rss-feed",
        message: "No RSS/Atom feed detected. RSS enables content syndication and loyal readership.",
        url,
        help: "Add an RSS feed for your blog or changelog to allow users to subscribe via feed readers.",
      });
    }
  } catch (error) {
    console.error(`[growth] RSS feed check failed: ${errorMessage(error)}`);
  }

  // 8. Check for referral/affiliate program
  try {
    const hasReferral = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const referralPatterns = /referral|refer|invite|affiliate/i;
      return links.some((link) => {
        const text = (link.textContent || "").trim();
        const href = link.getAttribute("href") || "";
        return referralPatterns.test(text) || referralPatterns.test(href);
      });
    });

    // Referral is a strength — low severity if missing
    if (!hasReferral) {
      violations.push({
        id: `growth-no-referral-${randomId()}`,
        category: "growth",
        severity: "low",
        rule: "no-referral-program",
        message: "No referral or affiliate program link found. Word-of-mouth is a powerful growth channel.",
        url,
        help: "Consider adding a referral or affiliate program to incentivize users to bring in new customers.",
      });
    }
  } catch (error) {
    console.error(`[growth] Referral program check failed: ${errorMessage(error)}`);
  }

  return { violations, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
