import type { Page } from "puppeteer-core";
import type { Violation, CheckResult, CheckCategory } from "@preship/shared";

/**
 * Result from growth potential checks including violations, check results, and total check count.
 */
export interface GrowthCheckResult {
  violations: Violation[];
  checkResults: CheckResult[];
  totalChecks: number;
}

const CATEGORY: CheckCategory = "growth";

/**
 * Run 20 comprehensive growth potential checks against a page.
 * Uses CUMULATIVE scoring: each check earns points if passed, 0 if not.
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns GrowthCheckResult with violations, checkResults, and total check count
 */
export async function runGrowthChecks(
  page: Page,
  url: string
): Promise<GrowthCheckResult> {
  const violations: Violation[] = [];
  const checkResults: CheckResult[] = [];
  const TOTAL_CHECKS = 20;

  function addCheck(id: string, name: string, passed: boolean, maxPoints: number, howToFix?: string) {
    checkResults.push({
      id, category: CATEGORY, name, passed,
      points: passed ? maxPoints : 0, maxPoints,
      howToFix: passed ? undefined : howToFix,
    });
    if (!passed && howToFix) {
      violations.push({
        id: `${id}-${randomId()}`, category: CATEGORY,
        severity: maxPoints >= 5 ? "high" : "medium",
        rule: id, message: howToFix, url, help: howToFix,
      });
    }
  }

  // 1. Blog with recent posts (5pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const hasBlogLink = links.some(l => {
        const text = (l.textContent || "").trim().toLowerCase();
        const href = (l.getAttribute("href") || "").toLowerCase();
        const isNavOrFooter = l.closest("nav, header, footer, [role='navigation'], [role='banner'], [role='contentinfo']") !== null;
        return isNavOrFooter && (/blog|articles|news|posts/i.test(text) || /blog|articles|news/i.test(href));
      });
      return hasBlogLink;
    });
    addCheck("growth-blog", "Blog with Posts", passed, 5,
      "Add a blog link in navigation with content to drive SEO traffic and establish authority.");
  } catch { addCheck("growth-blog", "Blog with Posts", false, 5); }

  // 2. Social media presence (5pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const socialDomains = [
        /twitter\.com|x\.com/i, /linkedin\.com/i, /github\.com/i,
        /youtube\.com/i, /instagram\.com/i, /facebook\.com/i,
        /tiktok\.com/i, /mastodon/i,
      ];
      const found = new Set<number>();
      for (const link of links) {
        const href = link.getAttribute("href") || "";
        for (let i = 0; i < socialDomains.length; i++) {
          if (socialDomains[i].test(href)) found.add(i);
        }
      }
      return found.size >= 3;
    });
    addCheck("growth-social-presence", "Social Media Presence", passed, 5,
      "Link to at least 3 active social profiles (Twitter/X, LinkedIn, GitHub, etc.).");
  } catch { addCheck("growth-social-presence", "Social Media Presence", false, 5); }

  // 3. Email capture form (5pts)
  try {
    const passed = await page.evaluate(() => {
      const emailInputs = Array.from(
        document.querySelectorAll('input[type="email"], input[placeholder*="email" i], input[name*="email" i]')
      );
      for (const input of emailInputs) {
        const parent = input.closest("form, section, div");
        if (parent) {
          const parentText = (parent.textContent || "").toLowerCase();
          if (/subscribe|newsletter|updates|notify|stay in the loop|get notified|sign up/i.test(parentText)) {
            return true;
          }
        }
      }
      const newsletterSelectors = '[class*="newsletter"], [id*="newsletter"], [class*="subscribe"], [id*="subscribe"]';
      return document.querySelectorAll(newsletterSelectors).length > 0;
    });
    addCheck("growth-email-capture", "Email Capture Form", passed, 5,
      "Add a newsletter signup or email capture form to build your audience.");
  } catch { addCheck("growth-email-capture", "Email Capture Form", false, 5); }

  // 4. Share buttons on content (3pts)
  try {
    const passed = await page.evaluate(() => {
      const shareSelectors = [
        '[class*="share"]', '[id*="share"]', '[aria-label*="share"]',
        'a[href*="twitter.com/intent/tweet"]', 'a[href*="x.com/intent"]',
        'a[href*="facebook.com/sharer"]', 'a[href*="linkedin.com/sharing"]',
        'a[href*="reddit.com/submit"]', '[class*="copy-link"]',
      ];
      if (document.querySelectorAll(shareSelectors.join(", ")).length > 0) return true;
      const buttons = Array.from(document.querySelectorAll("button, a"));
      return buttons.some(btn => {
        const text = (btn.textContent || "").trim().toLowerCase();
        return text === "share" || text.includes("share on") || text.includes("copy link");
      });
    });
    addCheck("growth-share-buttons", "Share Buttons", passed, 3,
      "Add social share buttons (Twitter/X, LinkedIn, copy link) to make content easily shareable.");
  } catch { addCheck("growth-share-buttons", "Share Buttons", false, 3); }

  // 5. Community links (3pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links.some(l => {
        const href = (l.getAttribute("href") || "").toLowerCase();
        return /discord\.gg|discord\.com|join\.slack\.com|slack\.com\/join|github\.com|reddit\.com\/r\/|community\.|forum\./i.test(href);
      });
    });
    addCheck("growth-community", "Community Links", passed, 3,
      "Create a community space (Discord, Slack, GitHub Discussions) where users can interact.");
  } catch { addCheck("growth-community", "Community Links", false, 3); }

  // 6. Open Graph tags complete (5pts)
  try {
    const passed = await page.evaluate(() => {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      return !!(ogTitle && ogDesc && ogImage);
    });
    addCheck("growth-og-tags", "Open Graph Tags Complete", passed, 5,
      "Set og:title, og:description, and og:image meta tags for rich social media previews.");
  } catch { addCheck("growth-og-tags", "Open Graph Tags Complete", false, 5); }

  // 7. Twitter Card meta tags (3pts)
  try {
    const passed = await page.evaluate(() => {
      const twitterCard = document.querySelector('meta[name="twitter:card"]');
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      return !!(twitterCard && twitterTitle);
    });
    addCheck("growth-twitter-cards", "Twitter Card Tags", passed, 3,
      "Set twitter:card and twitter:title meta tags for Twitter/X share previews.");
  } catch { addCheck("growth-twitter-cards", "Twitter Card Tags", false, 3); }

  // 8. Sitemap.xml exists (5pts)
  try {
    let passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const hasSitemapLink = links.some(l => {
        const href = (l.getAttribute("href") || "").toLowerCase();
        return href.includes("sitemap");
      });
      const hasSitemapMeta = document.querySelector('link[rel="sitemap"]') !== null;
      return hasSitemapLink || hasSitemapMeta;
    });
    if (!passed) {
      try {
        const parsedUrl = new URL(url);
        const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
        passed = await page.evaluate(async (robotsUrl: string) => {
          try {
            const res = await fetch(robotsUrl, { method: "GET" });
            if (res.ok) {
              const text = await res.text();
              return text.toLowerCase().includes("sitemap");
            }
          } catch {}
          return false;
        }, robotsUrl);
      } catch {}
    }
    addCheck("growth-sitemap", "Sitemap.xml", passed, 5,
      "Create a sitemap.xml and reference it in robots.txt for better search engine indexing.");
  } catch { addCheck("growth-sitemap", "Sitemap.xml", false, 5); }

  // 9. robots.txt exists and allows crawling (3pts)
  try {
    const parsedUrl = new URL(url);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
    const passed = await page.evaluate(async (robotsUrl: string) => {
      try {
        const res = await fetch(robotsUrl, { method: "GET" });
        if (res.ok) {
          const text = await res.text();
          return !text.includes("Disallow: /\n") && !text.includes("Disallow: / ");
        }
      } catch {}
      return false;
    }, robotsUrl);
    addCheck("growth-robots-txt", "robots.txt Allows Crawling", passed, 3,
      "Ensure robots.txt exists and allows search engine crawling of important pages.");
  } catch { addCheck("growth-robots-txt", "robots.txt Allows Crawling", false, 3); }

  // 10. RSS/Atom feed available (3pts)
  try {
    const passed = await page.evaluate(() => {
      return document.querySelector(
        'link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]'
      ) !== null;
    });
    addCheck("growth-rss-feed", "RSS/Atom Feed", passed, 3,
      "Add an RSS or Atom feed for your blog/changelog so users can subscribe via feed readers.");
  } catch { addCheck("growth-rss-feed", "RSS/Atom Feed", false, 3); }

  // 11. Schema.org structured data (5pts)
  try {
    const passed = await page.evaluate(() => {
      const hasJsonLd = document.querySelectorAll('script[type="application/ld+json"]').length > 0;
      const hasMicrodata = document.querySelectorAll('[itemscope]').length > 0;
      return hasJsonLd || hasMicrodata;
    });
    addCheck("growth-structured-data", "Schema.org Structured Data", passed, 5,
      "Add JSON-LD or microdata structured data for rich search result snippets.");
  } catch { addCheck("growth-structured-data", "Schema.org Structured Data", false, 5); }

  // 12. Analytics tool detected (3pts)
  try {
    const passed = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script[src]"));
      const srcs = scripts.map(s => (s as HTMLScriptElement).src.toLowerCase());
      return srcs.some(src =>
        /google-analytics|googletagmanager|gtag|plausible|mixpanel|amplitude|segment|posthog|fathom|umami|pirsch/i.test(src)
      );
    });
    addCheck("growth-analytics", "Analytics Tool", passed, 3,
      "Add an analytics tool (Google Analytics, Plausible, Mixpanel) to track user behavior.");
  } catch { addCheck("growth-analytics", "Analytics Tool", false, 3); }

  // 13. SEO-friendly URLs (3pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      const navLinks = links.filter(l =>
        l.closest("nav, header, [role='navigation']") !== null
      );
      if (navLinks.length === 0) return true;
      const badUrls = navLinks.filter(l => {
        const href = l.getAttribute("href") ?? "";
        return href.includes("?") && !href.includes("utm_");
      });
      return badUrls.length === 0;
    });
    addCheck("growth-seo-urls", "SEO-Friendly URLs", passed, 3,
      "Use clean, readable URLs without query string parameters for main navigation pages.");
  } catch { addCheck("growth-seo-urls", "SEO-Friendly URLs", false, 3); }

  // 14. Internal linking (3pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      const currentHost = window.location.hostname;
      const internalLinks = links.filter(l => {
        const href = l.getAttribute("href") ?? "";
        if (href.startsWith("/") || href.startsWith("#")) return true;
        try { return new URL(href).hostname === currentHost; } catch { return false; }
      });
      return internalLinks.length >= 5;
    });
    addCheck("growth-internal-linking", "Internal Linking", passed, 3,
      "Ensure pages link to each other internally (at least 5 internal links) for better SEO.");
  } catch { addCheck("growth-internal-linking", "Internal Linking", false, 3); }

  // 15. Canonical URLs set (3pts)
  try {
    const passed = await page.evaluate(() => {
      return document.querySelector('link[rel="canonical"]') !== null;
    });
    addCheck("growth-canonical-urls", "Canonical URLs", passed, 3,
      "Add <link rel='canonical'> to prevent duplicate content issues in search engines.");
  } catch { addCheck("growth-canonical-urls", "Canonical URLs", false, 3); }

  // 16. Referral/affiliate program (5pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links.some(l => {
        const text = (l.textContent || "").trim().toLowerCase();
        const href = (l.getAttribute("href") || "").toLowerCase();
        return /referral|refer|invite|affiliate/i.test(text) || /referral|refer|affiliate/i.test(href);
      });
    });
    addCheck("growth-referral-program", "Referral/Affiliate Program", passed, 5,
      "Add a referral or affiliate program to incentivize word-of-mouth growth.");
  } catch { addCheck("growth-referral-program", "Referral/Affiliate Program", false, 5); }

  // 17. Product Hunt or review site badges (3pts)
  try {
    const passed = await page.evaluate(() => {
      const body = document.body?.innerHTML ?? "";
      return /producthunt\.com|product hunt|g2\.com|capterra|trustpilot|getapp/i.test(body) ||
        document.querySelectorAll('a[href*="producthunt.com"], a[href*="g2.com"], a[href*="capterra"], a[href*="trustpilot"]').length > 0;
    });
    addCheck("growth-review-badges", "Review Site Badges", passed, 3,
      "Add Product Hunt, G2, or Trustpilot badges to leverage third-party credibility.");
  } catch { addCheck("growth-review-badges", "Review Site Badges", false, 3); }

  // 18. Social proof shareable (3pts)
  try {
    const passed = await page.evaluate(() => {
      const body = document.body?.innerHTML?.toLowerCase() ?? "";
      return /powered by|built with|made with|badge.*embed|widget.*embed|share.*score/i.test(body);
    });
    addCheck("growth-shareable-proof", "Shareable Social Proof", passed, 3,
      "Offer 'Powered by' badges or embeddable widgets for viral distribution.");
  } catch { addCheck("growth-shareable-proof", "Shareable Social Proof", false, 3); }

  // 19. Multi-language support (3pts)
  try {
    const passed = await page.evaluate(() => {
      const hasHreflang = document.querySelectorAll('link[hreflang]').length > 0;
      const hasLangSwitcher = document.querySelectorAll(
        '[class*="lang"], [class*="language"], [class*="locale"], [id*="language"], [id*="locale"]'
      ).length > 0;
      return hasHreflang || hasLangSwitcher;
    });
    addCheck("growth-multi-language", "Multi-Language Support", passed, 3,
      "Add hreflang tags or a language selector for international audience reach.");
  } catch { addCheck("growth-multi-language", "Multi-Language Support", false, 3); }

  // 20. Newsletter with lead magnet (5pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText?.toLowerCase() ?? "";
      return /free.*ebook|free.*guide|free.*template|free.*download|free.*resource|lead magnet|get.*free|download.*free/i.test(bodyText) ||
        (/newsletter|subscribe/i.test(bodyText) && /free|bonus|exclusive|get/i.test(bodyText));
    });
    addCheck("growth-lead-magnet", "Newsletter with Lead Magnet", passed, 5,
      "Offer something free (ebook, guide, template) in exchange for email signups.");
  } catch { addCheck("growth-lead-magnet", "Newsletter with Lead Magnet", false, 5); }

  return { violations, checkResults, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
