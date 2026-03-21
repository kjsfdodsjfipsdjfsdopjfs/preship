import type { Page } from "puppeteer-core";
import type { Violation } from "@preship/shared";

/**
 * Result from business viability checks including violations and total check count.
 */
export interface BusinessCheckResult {
  violations: Violation[];
  totalChecks: number;
}

/**
 * Run comprehensive business viability checks against a page.
 * All checks are 100% automated with no LLM dependency.
 *
 * Checks for:
 * - Pricing page link presence
 * - Value proposition in hero area
 * - About/team page link presence
 * - Custom domain vs default platform subdomain
 * - Legal pages (privacy policy, terms, cookies)
 * - Contact information (email, phone, forms)
 * - SSL certificate (HTTPS)
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns BusinessCheckResult with violations and total check count
 */
export async function runBusinessChecks(
  page: Page,
  url: string
): Promise<BusinessCheckResult> {
  const violations: Violation[] = [];
  const TOTAL_CHECKS = 7;

  // ── 1. Pricing page ───────────────────────────────────────────────────
  try {
    const pricingData = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      const pricingKeywords = ["pricing", "plans", "price", "packages", "subscribe"];
      const pricingLink = links.find((link) => {
        const href = (link.getAttribute("href") ?? "").toLowerCase();
        const text = (link.textContent ?? "").toLowerCase();
        return pricingKeywords.some((kw) => href.includes(kw) || text.includes(kw));
      });

      return { hasPricingLink: !!pricingLink };
    });

    if (!pricingData.hasPricingLink) {
      violations.push({
        id: `business-no-pricing-${randomId()}`,
        category: "business",
        severity: "high",
        rule: "no-pricing-page",
        message: "No pricing page link found in the navigation or footer. Visitors cannot easily find pricing information.",
        url,
        help: "Add a clearly labeled 'Pricing' or 'Plans' link in your main navigation or footer to help visitors evaluate your offering.",
      });
    }
  } catch (e) {
    console.error(`[business] Pricing page check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 2. Value proposition ──────────────────────────────────────────────
  try {
    const valueData = await page.evaluate(() => {
      // Look for heading text in the top 500px of the page
      const headings = Array.from(document.querySelectorAll("h1, h2"));
      let heroHeading: { text: string; top: number } | null = null;

      for (const h of headings) {
        const rect = h.getBoundingClientRect();
        if (rect.top < 500 && rect.top >= 0) {
          const text = (h.textContent ?? "").trim();
          if (text.length > 0) {
            heroHeading = { text: text.substring(0, 200), top: Math.round(rect.top) };
            break;
          }
        }
      }

      return { hasHeroHeading: !!heroHeading, heading: heroHeading };
    });

    if (!valueData.hasHeroHeading) {
      violations.push({
        id: `business-no-value-prop-${randomId()}`,
        category: "business",
        severity: "critical",
        rule: "no-value-proposition",
        message: "No heading (h1 or h2) with text found in the hero area (top 500px). Visitors cannot immediately understand what this product does.",
        url,
        help: "Add a clear, concise headline in the hero section that explains your product's value proposition in one sentence.",
      });
    }
  } catch (e) {
    console.error(`[business] Value proposition check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 3. About page ────────────────────────────────────────────────────
  try {
    const aboutData = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      const aboutKeywords = ["/about", "/team", "/company", "/our-story", "/who-we-are"];
      const aboutLink = links.find((link) => {
        const href = (link.getAttribute("href") ?? "").toLowerCase();
        const text = (link.textContent ?? "").toLowerCase();
        return (
          aboutKeywords.some((kw) => href.includes(kw)) ||
          text === "about" ||
          text === "about us" ||
          text === "our team" ||
          text === "company"
        );
      });

      return { hasAboutLink: !!aboutLink };
    });

    if (!aboutData.hasAboutLink) {
      violations.push({
        id: `business-no-about-${randomId()}`,
        category: "business",
        severity: "medium",
        rule: "no-about-page",
        message: "No about/team/company page link found. Visitors may not trust a product without knowing who is behind it.",
        url,
        help: "Add an 'About', 'Team', or 'Company' link in your navigation or footer to build trust and credibility.",
      });
    }
  } catch (e) {
    console.error(`[business] About page check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 4. Custom domain ──────────────────────────────────────────────────
  try {
    const platformSubdomains = [
      ".vercel.app",
      ".netlify.app",
      ".lovable.app",
      ".railway.app",
      ".herokuapp.com",
      ".fly.dev",
      ".render.com",
      ".surge.sh",
      ".pages.dev",
      ".web.app",
      ".firebaseapp.com",
      ".github.io",
      ".gitlab.io",
      ".azurewebsites.net",
      ".onrender.com",
      ".up.railway.app",
      ".repl.co",
      ".glitch.me",
    ];

    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const isPlatformDomain = platformSubdomains.some((sub) => hostname.endsWith(sub));

    if (isPlatformDomain) {
      violations.push({
        id: `business-no-custom-domain-${randomId()}`,
        category: "business",
        severity: "high",
        rule: "no-custom-domain",
        message: `Site is using a platform subdomain (${hostname}). A custom domain is essential for brand credibility and SEO.`,
        url,
        help: "Register a custom domain and configure it with your hosting provider. This improves trust, SEO, and brand recognition.",
      });
    }
  } catch (e) {
    console.error(`[business] Custom domain check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 5. Legal pages ────────────────────────────────────────────────────
  try {
    const legalData = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));

      const findLink = (keywords: string[]): boolean => {
        return links.some((link) => {
          const href = (link.getAttribute("href") ?? "").toLowerCase();
          const text = (link.textContent ?? "").toLowerCase();
          return keywords.some((kw) => href.includes(kw) || text.includes(kw));
        });
      };

      return {
        hasPrivacyPolicy: findLink(["privacy", "privacy-policy", "privacypolicy"]),
        hasTermsOfService: findLink(["terms", "terms-of-service", "tos", "terms-and-conditions"]),
        hasCookiePolicy: findLink(["cookie", "cookie-policy", "cookiepolicy"]),
      };
    });

    if (!legalData.hasPrivacyPolicy) {
      violations.push({
        id: `business-no-privacy-policy-${randomId()}`,
        category: "business",
        severity: "critical",
        rule: "no-privacy-policy",
        message: "No privacy policy link found. A privacy policy is legally required in most jurisdictions (GDPR, CCPA, etc.).",
        url,
        help: "Add a link to your privacy policy in the footer. This is a legal requirement if you collect any user data.",
      });
    }

    if (!legalData.hasTermsOfService) {
      violations.push({
        id: `business-no-terms-${randomId()}`,
        category: "business",
        severity: "high",
        rule: "no-terms-of-service",
        message: "No terms of service link found. Terms of service protect both you and your users.",
        url,
        help: "Add a link to your terms of service in the footer. This defines the rules for using your product and limits liability.",
      });
    }

    if (!legalData.hasCookiePolicy) {
      violations.push({
        id: `business-no-cookie-policy-${randomId()}`,
        category: "business",
        severity: "medium",
        rule: "no-cookie-policy",
        message: "No cookie policy link found. If your site uses cookies, a cookie policy is required under GDPR.",
        url,
        help: "Add a cookie policy link in the footer if your site uses cookies (including analytics, ads, or session cookies).",
      });
    }
  } catch (e) {
    console.error(`[business] Legal pages check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 6. Contact information ────────────────────────────────────────────
  try {
    const contactData = await page.evaluate(() => {
      // Check for mailto links
      const mailtoLinks = document.querySelectorAll("a[href^='mailto:']");
      const hasEmail = mailtoLinks.length > 0;

      // Check for phone numbers (tel: links)
      const telLinks = document.querySelectorAll("a[href^='tel:']");
      const hasPhone = telLinks.length > 0;

      // Check for contact forms
      const forms = Array.from(document.querySelectorAll("form"));
      const hasContactForm = forms.some((form) => {
        const formText = form.textContent?.toLowerCase() ?? "";
        const formAction = (form.getAttribute("action") ?? "").toLowerCase();
        return (
          formText.includes("contact") ||
          formText.includes("message") ||
          formText.includes("get in touch") ||
          formAction.includes("contact")
        );
      });

      // Check for contact page links
      const links = Array.from(document.querySelectorAll("a[href]"));
      const hasContactLink = links.some((link) => {
        const href = (link.getAttribute("href") ?? "").toLowerCase();
        const text = (link.textContent ?? "").toLowerCase();
        return href.includes("/contact") || text === "contact" || text === "contact us" || text === "get in touch";
      });

      return { hasEmail, hasPhone, hasContactForm, hasContactLink };
    });

    if (
      !contactData.hasEmail &&
      !contactData.hasPhone &&
      !contactData.hasContactForm &&
      !contactData.hasContactLink
    ) {
      violations.push({
        id: `business-no-contact-${randomId()}`,
        category: "business",
        severity: "high",
        rule: "no-contact-info",
        message: "No contact information found. No email, phone, contact form, or contact page link detected.",
        url,
        help: "Add at least one way for visitors to contact you: an email address (mailto: link), phone number, contact form, or link to a contact page.",
      });
    }
  } catch (e) {
    console.error(`[business] Contact info check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 7. SSL certificate ────────────────────────────────────────────────
  try {
    const isHttps = url.startsWith("https://");

    if (!isHttps) {
      violations.push({
        id: `business-no-ssl-${randomId()}`,
        category: "business",
        severity: "critical",
        rule: "no-ssl",
        message: "Page is not served over HTTPS. SSL is essential for security, SEO, and user trust.",
        url,
        help: "Enable HTTPS on your domain. Most hosting providers offer free SSL certificates via Let's Encrypt.",
      });
    }
  } catch (e) {
    console.error(`[business] SSL check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { violations, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
