import type { Page } from "puppeteer-core";
import type { Violation, CheckResult, CheckCategory } from "@preship/shared";

/**
 * Result from human appeal checks including violations, check results, and total check count.
 */
export interface HumanAppealCheckResult {
  violations: Violation[];
  checkResults: CheckResult[];
  totalChecks: number;
}

const CATEGORY: CheckCategory = "human_appeal";

/**
 * Run 20 comprehensive human appeal checks against a page.
 * Uses CUMULATIVE scoring: each check earns points if passed, 0 if not.
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns HumanAppealCheckResult with violations, checkResults, and total check count
 */
export async function runHumanAppealChecks(
  page: Page,
  url: string
): Promise<HumanAppealCheckResult> {
  const violations: Violation[] = [];
  const checkResults: CheckResult[] = [];
  const TOTAL_CHECKS = 20;

  // Helper to add a check result and optionally a violation
  function addCheck(
    id: string,
    name: string,
    passed: boolean,
    maxPoints: number,
    howToFix?: string
  ) {
    checkResults.push({
      id,
      category: CATEGORY,
      name,
      passed,
      points: passed ? maxPoints : 0,
      maxPoints,
      howToFix: passed ? undefined : howToFix,
    });
    if (!passed && howToFix) {
      violations.push({
        id: `${id}-${randomId()}`,
        category: CATEGORY,
        severity: maxPoints >= 5 ? "high" : "medium",
        rule: id,
        message: howToFix,
        url,
        help: howToFix,
      });
    }
  }

  // 1. Clear value proposition in hero (5pts)
  try {
    const passed = await page.evaluate(() => {
      const headings = document.querySelectorAll("h1, h2");
      for (const h of headings) {
        const rect = h.getBoundingClientRect();
        const text = (h.textContent || "").trim();
        const wordCount = text.split(/\s+/).length;
        if (rect.top < 600 && text.length > 10 && wordCount <= 15 && h.closest("nav") === null) {
          return true;
        }
      }
      return false;
    });
    addCheck("human-appeal-value-proposition", "Clear Value Proposition", passed, 5,
      "Add a clear headline (h1/h2) in the hero that communicates what the product does in under 15 words.");
  } catch { addCheck("human-appeal-value-proposition", "Clear Value Proposition", false, 5); }

  // 2. Trust signals present (5pts)
  try {
    const passed = await page.evaluate(() => {
      const body = document.body?.innerHTML?.toLowerCase() ?? "";
      let count = 0;
      if (/testimonial|review|what customers say|what people say|customer stories/i.test(body)) count++;
      const logoSections = document.querySelectorAll('[class*="logo"], [class*="partner"], [class*="trusted"], [class*="client"], [class*="brand"]');
      if (logoSections.length > 0 && Array.from(logoSections).some(s => s.querySelectorAll("img, svg").length >= 2)) count++;
      if (document.querySelectorAll('[class*="badge"], [class*="seal"], [class*="certified"], [alt*="secure"], [alt*="verified"]').length > 0) count++;
      const caseStudy = /case stud|success stor/i.test(body);
      if (caseStudy) count++;
      return count >= 2;
    });
    addCheck("human-appeal-trust-signals", "Trust Signals Present", passed, 5,
      "Add at least 2 trust signals: testimonials, customer logos, badges, or case studies.");
  } catch { addCheck("human-appeal-trust-signals", "Trust Signals Present", false, 5); }

  // 3. Social proof with numbers (5pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      const patterns = [
        /\d[\d,]*\+?\s*(users|customers|companies|teams|downloads|installs)/i,
        /\d+(\.\d+)?\s*(star|stars|rating)/i,
        /trusted by\s+\d/i,
        /used by\s+\d/i,
        /join\s+\d[\d,]*\+?\s*/i,
      ];
      return patterns.some(p => p.test(bodyText));
    });
    addCheck("human-appeal-social-proof", "Social Proof with Numbers", passed, 5,
      "Add specific stats like '10K+ users' or '4.9 stars' instead of vague claims.");
  } catch { addCheck("human-appeal-social-proof", "Social Proof with Numbers", false, 5); }

  // 4. Real testimonials (5pts)
  try {
    const passed = await page.evaluate(() => {
      const testimonials = document.querySelectorAll('blockquote, [class*="testimonial"], [class*="review"], [class*="quote"]');
      if (testimonials.length === 0) return false;
      return Array.from(testimonials).some(t => {
        const text = (t.textContent || "").trim();
        return text.length > 30 && !/lorem ipsum|placeholder|your name/i.test(text);
      });
    });
    addCheck("human-appeal-real-testimonials", "Real Testimonials", passed, 5,
      "Add real testimonials with names in blockquote or testimonial sections, not placeholder text.");
  } catch { addCheck("human-appeal-real-testimonials", "Real Testimonials", false, 5); }

  // 5. Team/founder visible (3pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const aboutPatterns = /about|team|founder|our-story|who-we-are|company/i;
      const hasAboutLink = links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return aboutPatterns.test(href) || aboutPatterns.test(text);
      });
      const bodyText = document.body?.innerText?.toLowerCase() ?? "";
      const hasFounderMention = /founder|ceo|co-founder|built by|created by|made by/i.test(bodyText);
      return hasAboutLink || hasFounderMention;
    });
    addCheck("human-appeal-team-visible", "Team/Founder Visible", passed, 3,
      "Add an about section or team page link with real content showing who is behind the product.");
  } catch { addCheck("human-appeal-team-visible", "Team/Founder Visible", false, 3); }

  // 6. Professional photography (3pts)
  try {
    const passed = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      const stockIndicators = /unsplash\.com|pexels\.com|placeholder\.com|via\.placeholder|stock|lorem|picsum/i;
      const hasStock = images.some(img => {
        const src = img.getAttribute("src") ?? "";
        return stockIndicators.test(src);
      });
      return !hasStock;
    });
    addCheck("human-appeal-professional-photos", "Professional Photography", passed, 3,
      "Replace obvious stock photos (unsplash/pexels URLs) with custom brand imagery.");
  } catch { addCheck("human-appeal-professional-photos", "Professional Photography", false, 3); }

  // 7. Contact info accessible (5pts)
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
    addCheck("human-appeal-contact-info", "Contact Info Accessible", passed, 5,
      "Add visible contact information: email, phone, or a contact form so visitors can reach you.");
  } catch { addCheck("human-appeal-contact-info", "Contact Info Accessible", false, 5); }

  // 8. Pricing is transparent (5pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      const hasPriceNumbers = /\$\d|€\d|£\d|\/mo|\/month|\/year|\/yr|free plan/i.test(bodyText);
      const links = Array.from(document.querySelectorAll("a"));
      const hasPricingLink = links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return /pricing|plans|price/.test(href) || /pricing|plans|price/.test(text);
      });
      return hasPriceNumbers || hasPricingLink;
    });
    addCheck("human-appeal-transparent-pricing", "Transparent Pricing", passed, 5,
      "Show prices on the page or link to a pricing page. Avoid 'contact for pricing' unless enterprise-only.");
  } catch { addCheck("human-appeal-transparent-pricing", "Transparent Pricing", false, 5); }

  // 9. Free trial/demo available (5pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      return /free trial|free plan|try free|start free|demo|freemium|get started free|no credit card/i.test(bodyText);
    });
    addCheck("human-appeal-free-trial", "Free Trial/Demo Available", passed, 5,
      "Offer a free trial, demo, or freemium tier to lower the barrier for new users.");
  } catch { addCheck("human-appeal-free-trial", "Free Trial/Demo Available", false, 5); }

  // 10. Clear onboarding path (5pts)
  try {
    const passed = await page.evaluate(() => {
      const ctaSelectors = [
        'a[class*="cta"]', 'a[class*="btn"]', 'a[class*="button"]',
        'button[class*="cta"]', 'button[class*="btn"]', 'button[class*="primary"]',
        'a[class*="primary"]', '[role="button"]',
      ];
      const allCTAs = document.querySelectorAll(ctaSelectors.join(", "));
      for (const el of allCTAs) {
        const rect = el.getBoundingClientRect();
        const text = (el.textContent || "").trim().toLowerCase();
        if (rect.top < 800 && rect.height > 0 && text.length > 0) {
          const href = el.getAttribute("href") ?? "";
          if (/sign|start|get started|register|try|demo|onboard/i.test(text) ||
              /sign|start|register|onboard|app\./i.test(href)) {
            return true;
          }
        }
      }
      return false;
    });
    addCheck("human-appeal-onboarding-path", "Clear Onboarding Path", passed, 5,
      "Ensure the primary CTA leads to signup or getting-started, not a dead end.");
  } catch { addCheck("human-appeal-onboarding-path", "Clear Onboarding Path", false, 5); }

  // 11. FAQ section exists (3pts)
  try {
    const passed = await page.evaluate(() => {
      const body = document.body?.innerHTML?.toLowerCase() ?? "";
      const hasFAQ = /faq|frequently asked|common questions/i.test(body);
      const hasAccordion = document.querySelectorAll('details, [class*="faq"], [class*="accordion"], [id*="faq"]').length > 0;
      return hasFAQ || hasAccordion;
    });
    addCheck("human-appeal-faq", "FAQ Section", passed, 3,
      "Add a FAQ section to address common questions and reduce support burden.");
  } catch { addCheck("human-appeal-faq", "FAQ Section", false, 3); }

  // 12. Live chat/support widget (3pts)
  try {
    const passed = await page.evaluate(() => {
      const chatSelectors = [
        '[class*="chat-widget"]', '[class*="intercom"]', '[class*="crisp"]',
        '[class*="drift"]', '[class*="zendesk"]', '[class*="tawk"]',
        '[id*="chat-widget"]', '[id*="intercom"]', '[id*="crisp"]',
        'iframe[src*="intercom"]', 'iframe[src*="crisp"]', 'iframe[src*="tawk"]',
      ];
      if (document.querySelectorAll(chatSelectors.join(", ")).length > 0) return true;
      const links = Array.from(document.querySelectorAll("a"));
      return links.some(l => {
        const text = (l.textContent ?? "").toLowerCase();
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        return /live chat|support|help center|help desk/i.test(text) || /support|help|helpdesk/i.test(href);
      });
    });
    addCheck("human-appeal-support-widget", "Live Chat/Support", passed, 3,
      "Add a live chat widget or visible support link so users can get help quickly.");
  } catch { addCheck("human-appeal-support-widget", "Live Chat/Support", false, 3); }

  // 13. Security/privacy badges (3pts)
  try {
    const passed = await page.evaluate(() => {
      const body = document.body?.innerHTML?.toLowerCase() ?? "";
      const hasBadges = document.querySelectorAll(
        '[class*="badge"], [class*="seal"], [class*="certified"], [alt*="secure"], [alt*="verified"], [alt*="soc"], [alt*="gdpr"]'
      ).length > 0;
      const hasSecurityText = /soc\s*2|gdpr|iso\s*27001|hipaa|pci|ssl secured|256.bit|encrypted/i.test(body);
      return hasBadges || hasSecurityText;
    });
    addCheck("human-appeal-security-badges", "Security/Privacy Badges", passed, 3,
      "Display trust badges or security certifications (SOC 2, GDPR, SSL) to build confidence.");
  } catch { addCheck("human-appeal-security-badges", "Security/Privacy Badges", false, 3); }

  // 14. Video demo or tour (5pts)
  try {
    const passed = await page.evaluate(() => {
      const hasVideo = document.querySelectorAll("video").length > 0;
      const hasEmbed = document.querySelectorAll(
        'iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="loom"], iframe[src*="wistia"], [class*="video"]'
      ).length > 0;
      const links = Array.from(document.querySelectorAll("a"));
      const hasVideoLink = links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        return /youtube\.com|vimeo\.com|loom\.com|wistia\.com/i.test(href);
      });
      return hasVideo || hasEmbed || hasVideoLink;
    });
    addCheck("human-appeal-video-demo", "Video Demo or Tour", passed, 5,
      "Add a product demo video (YouTube, Vimeo, Loom) to show the product in action.");
  } catch { addCheck("human-appeal-video-demo", "Video Demo or Tour", false, 5); }

  // 15. Customer success stories (3pts)
  try {
    const passed = await page.evaluate(() => {
      const body = document.body?.innerHTML?.toLowerCase() ?? "";
      const links = Array.from(document.querySelectorAll("a"));
      const hasCaseStudies = /case stud|success stor|customer stor/i.test(body);
      const hasCaseStudyLink = links.some(l => {
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        const text = (l.textContent ?? "").toLowerCase();
        return /case-stud|success-stor|customer-stor/i.test(href) || /case stud|success stor/i.test(text);
      });
      return hasCaseStudies || hasCaseStudyLink;
    });
    addCheck("human-appeal-success-stories", "Customer Success Stories", passed, 3,
      "Add case study links or detailed customer success stories to demonstrate value.");
  } catch { addCheck("human-appeal-success-stories", "Customer Success Stories", false, 3); }

  // 16. Press/media mentions (3pts)
  try {
    const passed = await page.evaluate(() => {
      const body = document.body?.innerHTML?.toLowerCase() ?? "";
      return /as seen in|featured in|press|media|in the news|mentioned by/i.test(body) ||
        document.querySelectorAll('[class*="press"], [class*="media"], [class*="featured-in"], [class*="as-seen"]').length > 0;
    });
    addCheck("human-appeal-press-mentions", "Press/Media Mentions", passed, 3,
      "Add an 'As seen in' section with press logos or media mentions for credibility.");
  } catch { addCheck("human-appeal-press-mentions", "Press/Media Mentions", false, 3); }

  // 17. Favicon is custom (3pts)
  try {
    const passed = await page.evaluate(() => {
      const selectors = [
        'link[rel="icon"]', 'link[rel="shortcut icon"]',
        'link[rel="apple-touch-icon"]', 'link[rel="apple-touch-icon-precomposed"]',
      ];
      return selectors.some(sel => document.querySelector(sel) !== null);
    });
    addCheck("human-appeal-favicon", "Custom Favicon", passed, 3,
      "Add a custom favicon with <link rel='icon' href='/favicon.ico'> for professional browser tabs.");
  } catch { addCheck("human-appeal-favicon", "Custom Favicon", false, 3); }

  // 18. Logo in header (3pts)
  try {
    const passed = await page.evaluate(() => {
      const headerNav = document.querySelector("header, nav, [role='banner']");
      if (!headerNav) return false;
      const images = headerNav.querySelectorAll("img, svg");
      for (const img of images) {
        const rect = img.getBoundingClientRect();
        if (rect.width > 16 && rect.height > 16) return true;
      }
      return false;
    });
    addCheck("human-appeal-header-logo", "Logo in Header", passed, 3,
      "Add your logo to the header/nav so visitors can immediately identify your brand.");
  } catch { addCheck("human-appeal-header-logo", "Logo in Header", false, 3); }

  // 19. Footer with essential links (5pts)
  try {
    const passed = await page.evaluate(() => {
      const footer = document.querySelector("footer, [role='contentinfo']");
      if (!footer) return false;
      const links = footer.querySelectorAll("a");
      const linkTexts = Array.from(links).map(a => (a.textContent || "").trim().toLowerCase());
      const hrefs = Array.from(links).map(a => (a.getAttribute("href") || "").toLowerCase());
      const hasSocial = hrefs.some(h => /twitter\.com|x\.com|facebook\.com|linkedin\.com|instagram\.com|youtube\.com|github\.com/.test(h));
      const hasLegal = linkTexts.some(t => /privacy|terms|legal|cookie|imprint/.test(t));
      const footerText = footer.textContent?.toLowerCase() ?? "";
      const hasContact = linkTexts.some(t => /contact|email|support/.test(t)) || /contact|@/.test(footerText);
      let groups = 0;
      if (hasSocial) groups++;
      if (hasLegal) groups++;
      if (hasContact) groups++;
      return groups >= 3;
    });
    addCheck("human-appeal-footer-links", "Footer with Essential Links", passed, 5,
      "Add a complete footer with social media links, legal/privacy links, and contact information.");
  } catch { addCheck("human-appeal-footer-links", "Footer with Essential Links", false, 5); }

  // 20. Page loads fast visually (5pts)
  try {
    const passed = await page.evaluate(() => {
      const entries = performance.getEntriesByType("paint") as PerformanceEntry[];
      const fcp = entries.find(e => e.name === "first-contentful-paint");
      if (fcp && fcp.startTime < 3000) return true;
      // Fallback: if paint entries not available, check if page loaded quickly
      const nav = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (nav.length > 0 && nav[0].domContentLoadedEventEnd < 3000) return true;
      return false;
    });
    addCheck("human-appeal-fast-load", "Fast Visual Load", passed, 5,
      "Optimize page so meaningful content renders in under 3 seconds (FCP < 3s).");
  } catch { addCheck("human-appeal-fast-load", "Fast Visual Load", false, 5); }

  return { violations, checkResults, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
