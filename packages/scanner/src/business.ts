import type { Page } from "puppeteer-core";
import type { Violation, CheckResult, CheckCategory } from "@preship/shared";

/**
 * Result from business viability checks including violations, check results, and total check count.
 */
export interface BusinessCheckResult {
  violations: Violation[];
  checkResults: CheckResult[];
  totalChecks: number;
}

const CATEGORY: CheckCategory = "business";

const PLATFORM_SUBDOMAINS = [
  ".vercel.app", ".netlify.app", ".lovable.app", ".railway.app",
  ".herokuapp.com", ".fly.dev", ".render.com", ".surge.sh",
  ".pages.dev", ".web.app", ".firebaseapp.com", ".github.io",
  ".gitlab.io", ".azurewebsites.net", ".onrender.com",
  ".up.railway.app", ".repl.co", ".glitch.me",
];

/**
 * Run 20 comprehensive business viability checks against a page.
 * Uses CUMULATIVE scoring: each check earns points if passed, 0 if not.
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns BusinessCheckResult with violations, checkResults, and total check count
 */
export async function runBusinessChecks(
  page: Page,
  url: string
): Promise<BusinessCheckResult> {
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

  // 1. Custom domain (8pts)
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const passed = !PLATFORM_SUBDOMAINS.some(sub => hostname.endsWith(sub));
    addCheck("business-custom-domain", "Custom Domain", passed, 8,
      `Site uses a platform subdomain (${hostname}). Register a custom domain for brand credibility and SEO.`);
  } catch { addCheck("business-custom-domain", "Custom Domain", false, 8); }

  // 2. SSL/HTTPS enabled (3pts)
  try {
    const passed = url.startsWith("https://");
    addCheck("business-ssl", "SSL/HTTPS Enabled", passed, 3,
      "Enable HTTPS on your domain. Most hosts offer free SSL via Let's Encrypt.");
  } catch { addCheck("business-ssl", "SSL/HTTPS Enabled", false, 3); }

  // 3. Privacy policy page (5pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      return links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return /privacy/.test(href) || /privacy/.test(text);
      });
    });
    addCheck("business-privacy-policy", "Privacy Policy", passed, 5,
      "Add a link to your privacy policy in the footer. Legally required under GDPR/CCPA.");
  } catch { addCheck("business-privacy-policy", "Privacy Policy", false, 5); }

  // 4. Terms of service (5pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      return links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return /terms|tos/.test(href) || /terms of service|terms and conditions|terms of use/.test(text);
      });
    });
    addCheck("business-terms", "Terms of Service", passed, 5,
      "Add terms of service link in the footer to protect both you and your users.");
  } catch { addCheck("business-terms", "Terms of Service", false, 5); }

  // 5. Cookie policy/banner (3pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      const hasCookieLink = links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return /cookie/.test(href) || /cookie/.test(text);
      });
      const hasBanner = document.querySelectorAll('[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"]').length > 0;
      return hasCookieLink || hasBanner;
    });
    addCheck("business-cookie-policy", "Cookie Policy/Banner", passed, 3,
      "Add a cookie policy link or consent banner for GDPR compliance.");
  } catch { addCheck("business-cookie-policy", "Cookie Policy/Banner", false, 3); }

  // 6. About page with real content (5pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      return links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return /\/about|\/team|\/company|\/our-story/.test(href) ||
          /^about$|^about us$|^our team$|^company$/.test(text.trim());
      });
    });
    addCheck("business-about-page", "About Page", passed, 5,
      "Add an About, Team, or Company page link to build trust and credibility.");
  } catch { addCheck("business-about-page", "About Page", false, 5); }

  // 7. Contact page with real info (5pts)
  try {
    const passed = await page.evaluate(() => {
      const hasEmail = document.querySelectorAll("a[href^='mailto:']").length > 0;
      const hasPhone = document.querySelectorAll("a[href^='tel:']").length > 0;
      const links = Array.from(document.querySelectorAll("a"));
      const hasContactLink = links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return href.includes("/contact") || text === "contact" || text === "contact us";
      });
      const forms = Array.from(document.querySelectorAll("form"));
      const hasContactForm = forms.some(f => {
        const text = (f.textContent ?? "").toLowerCase();
        return text.includes("contact") || text.includes("message") || text.includes("get in touch");
      });
      return hasEmail || hasPhone || hasContactLink || hasContactForm;
    });
    addCheck("business-contact-page", "Contact Page", passed, 5,
      "Add contact information: email, phone, or a contact page link so visitors can reach you.");
  } catch { addCheck("business-contact-page", "Contact Page", false, 5); }

  // 8. Pricing page exists (5pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      return links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return /pricing|plans|price|packages/.test(href) || /pricing|plans|price/.test(text);
      });
    });
    addCheck("business-pricing-page", "Pricing Page", passed, 5,
      "Add a clearly labeled Pricing or Plans link in your navigation or footer.");
  } catch { addCheck("business-pricing-page", "Pricing Page", false, 5); }

  // 9. Multiple pricing tiers (5pts)
  try {
    const passed = await page.evaluate(() => {
      const sections = document.querySelectorAll('[class*="pricing"], [class*="plan"], [class*="tier"], [id*="pricing"], [id*="plans"]');
      if (sections.length === 0) return false;
      for (const section of sections) {
        const cards = section.querySelectorAll('[class*="card"], [class*="tier"], [class*="plan"], [class*="column"], [class*="option"]');
        if (cards.length >= 2 && cards.length <= 4) return true;
      }
      return false;
    });
    addCheck("business-pricing-tiers", "Multiple Pricing Tiers", passed, 5,
      "Offer 2-4 pricing tiers (e.g., Free, Pro, Enterprise) to capture different customer segments.");
  } catch { addCheck("business-pricing-tiers", "Multiple Pricing Tiers", false, 5); }

  // 10. Enterprise/custom tier option (3pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      return /enterprise|custom plan|contact sales|talk to sales|custom pricing/i.test(bodyText);
    });
    addCheck("business-enterprise-tier", "Enterprise Tier", passed, 3,
      "Add an enterprise or custom tier option for larger customers.");
  } catch { addCheck("business-enterprise-tier", "Enterprise Tier", false, 3); }

  // 11. Documentation/help center (5pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links.some(l => {
        const text = (l.textContent || "").trim().toLowerCase();
        const href = (l.getAttribute("href") || "").toLowerCase();
        return /docs|documentation|help|support|guide|knowledge\s*base/i.test(text) ||
          /docs|documentation|help|support|guide/i.test(href);
      });
    });
    addCheck("business-docs", "Documentation/Help Center", passed, 5,
      "Add documentation, help center, or FAQ link so users can find answers independently.");
  } catch { addCheck("business-docs", "Documentation/Help Center", false, 5); }

  // 12. Changelog/updates page (3pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links.some(l => {
        const text = (l.textContent || "").trim().toLowerCase();
        const href = (l.getAttribute("href") || "").toLowerCase();
        return /changelog|updates|release\s*notes|what'?s\s*new/i.test(text) ||
          /changelog|updates|release/i.test(href);
      });
    });
    addCheck("business-changelog", "Changelog/Updates", passed, 3,
      "Add a changelog or updates page to show active development and product momentum.");
  } catch { addCheck("business-changelog", "Changelog/Updates", false, 3); }

  // 13. Status page (3pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links.some(l => {
        const text = (l.textContent || "").trim().toLowerCase();
        const href = (l.getAttribute("href") || "").toLowerCase();
        return text === "status" || text.includes("system status") ||
          /status\.|statuspage\.io|upptime|instatus/i.test(href);
      });
    });
    addCheck("business-status-page", "Status Page", passed, 3,
      "Add a public status page (e.g., Instatus, Upptime) to build trust with paying customers.");
  } catch { addCheck("business-status-page", "Status Page", false, 3); }

  // 14. Blog with content (5pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links.some(l => {
        const text = (l.textContent || "").trim().toLowerCase();
        const href = (l.getAttribute("href") || "").toLowerCase();
        const isNavOrFooter = l.closest("nav, header, footer, [role='navigation'], [role='banner'], [role='contentinfo']") !== null;
        return isNavOrFooter && (/blog|articles|news/i.test(text) || /blog|articles|news/i.test(href));
      });
    });
    addCheck("business-blog", "Blog with Content", passed, 5,
      "Add a blog with actual posts to drive SEO traffic and establish authority.");
  } catch { addCheck("business-blog", "Blog with Content", false, 5); }

  // 15. Company registration/legal entity (3pts)
  try {
    const passed = await page.evaluate(() => {
      const footer = document.querySelector("footer, [role='contentinfo']");
      if (!footer) return false;
      const footerText = footer.textContent?.toLowerCase() ?? "";
      return /inc\.|llc|ltd|gmbh|corp|pty|s\.a\.|co\.|company|registered|incorporation|\u00a9\s*\d{4}/i.test(footerText);
    });
    addCheck("business-legal-entity", "Company Legal Entity", passed, 3,
      "Show company name with legal entity type (Inc., LLC, Ltd) in the footer or legal pages.");
  } catch { addCheck("business-legal-entity", "Company Legal Entity", false, 3); }

  // 16. Clear revenue model (5pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      return /\$\d|€\d|£\d|\/mo|\/month|\/year|free plan|pricing|subscribe|buy now|purchase|add to cart/i.test(bodyText);
    });
    addCheck("business-revenue-model", "Clear Revenue Model", passed, 5,
      "Make it obvious how the business makes money: show prices, subscription options, or purchase CTAs.");
  } catch { addCheck("business-revenue-model", "Clear Revenue Model", false, 5); }

  // 17. Refund/cancellation policy (3pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText?.toLowerCase() ?? "";
      const links = Array.from(document.querySelectorAll("a"));
      const hasRefundLink = links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return /refund|cancellation|return/i.test(href) || /refund|cancellation|return policy/i.test(text);
      });
      return hasRefundLink || /refund|money.?back|cancellation policy|return policy/i.test(bodyText);
    });
    addCheck("business-refund-policy", "Refund/Cancellation Policy", passed, 3,
      "Add a refund or cancellation policy link to set clear expectations for customers.");
  } catch { addCheck("business-refund-policy", "Refund/Cancellation Policy", false, 3); }

  // 18. API documentation (3pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return /api\s*doc|api\s*ref|developer|\/api/i.test(href) || /api\s*doc|api\s*ref|developer/i.test(text);
      });
    });
    addCheck("business-api-docs", "API Documentation", passed, 3,
      "Add API documentation for developer-facing products to enable integrations.");
  } catch { addCheck("business-api-docs", "API Documentation", false, 3); }

  // 19. Careers/hiring page (3pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return /careers|jobs|hiring|join.*team|work.*with.*us/i.test(href) ||
          /careers|jobs|hiring|join.*team|we.*hiring/i.test(text);
      });
    });
    addCheck("business-careers", "Careers/Hiring Page", passed, 3,
      "Add a careers or hiring page to show the company is growing.");
  } catch { addCheck("business-careers", "Careers/Hiring Page", false, 3); }

  // 20. Multi-language support (3pts)
  try {
    const passed = await page.evaluate(() => {
      const hasHreflang = document.querySelectorAll('link[hreflang]').length > 0;
      const hasLangSwitcher = document.querySelectorAll(
        '[class*="lang"], [class*="language"], [class*="locale"], [id*="language"], [id*="locale"]'
      ).length > 0;
      const hasMultiLangMeta = document.querySelectorAll('meta[http-equiv="content-language"]').length > 0;
      return hasHreflang || hasLangSwitcher || hasMultiLangMeta;
    });
    addCheck("business-multi-language", "Multi-Language Support", passed, 3,
      "Add language switcher or hreflang tags to support international audiences.");
  } catch { addCheck("business-multi-language", "Multi-Language Support", false, 3); }

  return { violations, checkResults, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
