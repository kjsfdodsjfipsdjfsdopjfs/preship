import type { Page } from "puppeteer-core";
import type { Violation } from "@preship/shared";

/**
 * Result from privacy checks including violations and total check count.
 */
export interface PrivacyCheckResult {
  violations: Violation[];
  totalChecks: number;
}

/**
 * Known third-party tracker patterns with their names and categories.
 */
const TRACKER_PATTERNS: { name: string; pattern: RegExp; category: string }[] = [
  { name: "Google Analytics", pattern: /google-analytics\.com|googletagmanager\.com|gtag\/js/i, category: "analytics" },
  { name: "Google Analytics 4", pattern: /googletagmanager\.com\/gtag/i, category: "analytics" },
  { name: "Facebook Pixel", pattern: /connect\.facebook\.net|facebook\.com\/tr/i, category: "advertising" },
  { name: "Meta Pixel", pattern: /facebook\.com\/tr\?/i, category: "advertising" },
  { name: "Hotjar", pattern: /static\.hotjar\.com|hotjar\.com/i, category: "analytics" },
  { name: "Mixpanel", pattern: /cdn\.mxpnl\.com|mixpanel\.com/i, category: "analytics" },
  { name: "Segment", pattern: /cdn\.segment\.com|api\.segment\.io/i, category: "analytics" },
  { name: "Amplitude", pattern: /cdn\.amplitude\.com|api\.amplitude\.com/i, category: "analytics" },
  { name: "Heap Analytics", pattern: /cdn\.heapanalytics\.com|heapanalytics\.com/i, category: "analytics" },
  { name: "FullStory", pattern: /fullstory\.com\/s\/fs\.js/i, category: "analytics" },
  { name: "TikTok Pixel", pattern: /analytics\.tiktok\.com/i, category: "advertising" },
  { name: "Twitter/X Pixel", pattern: /static\.ads-twitter\.com|t\.co\/i\/adsct/i, category: "advertising" },
  { name: "LinkedIn Insight", pattern: /snap\.licdn\.com|linkedin\.com\/px/i, category: "advertising" },
  { name: "Intercom", pattern: /widget\.intercom\.io|intercomcdn\.com/i, category: "customer-support" },
  { name: "Drift", pattern: /js\.driftt\.com|drift\.com/i, category: "customer-support" },
  { name: "HubSpot", pattern: /js\.hs-scripts\.com|js\.hubspot\.com/i, category: "marketing" },
  { name: "Crisp", pattern: /client\.crisp\.chat/i, category: "customer-support" },
  { name: "Clarity", pattern: /clarity\.ms/i, category: "analytics" },
  { name: "PostHog", pattern: /posthog\.com|app\.posthog\.com/i, category: "analytics" },
  { name: "Sentry", pattern: /browser\.sentry-cdn\.com|sentry\.io/i, category: "error-tracking" },
];

/**
 * Run comprehensive privacy checks against a page.
 *
 * Checks include:
 * - Privacy policy link detection
 * - Cookie consent banner detection
 * - Third-party tracker count and identification
 * - HTTPS enforcement
 * - Secure cookie flags on sensitive cookies
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns PrivacyCheckResult with violations and total check count
 */
export async function runPrivacyChecks(
  page: Page,
  url: string
): Promise<PrivacyCheckResult> {
  const violations: Violation[] = [];
  const TOTAL_CHECKS = 5;

  try {
    // 1. Check for privacy policy link
    const hasPrivacyPolicy = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const privacyPatterns = /privacy\s*policy|privacy|datenschutz|politique\s*de\s*confidentialit/i;
      return links.some((link) => {
        const text = (link.textContent || "").trim();
        const href = link.getAttribute("href") || "";
        return privacyPatterns.test(text) || /privacy/i.test(href);
      });
    });

    if (!hasPrivacyPolicy) {
      violations.push({
        id: `privacy-policy-missing-${randomId()}`,
        category: "privacy",
        severity: "high",
        rule: "privacy-policy-missing",
        message: "No privacy policy link found on the page.",
        url,
        help: "Add a visible link to your privacy policy. This is required by GDPR, CCPA, and most privacy regulations.",
        helpUrl: "https://gdpr.eu/privacy-notice/",
      });
    }

    // 2. Check for cookie consent banner
    const cookieConsentInfo = await page.evaluate(() => {
      // Common cookie consent selectors and patterns
      const consentSelectors = [
        '[class*="cookie-consent"]',
        '[class*="cookie-banner"]',
        '[class*="cookie-notice"]',
        '[class*="cookie-popup"]',
        '[class*="consent-banner"]',
        '[class*="consent-modal"]',
        '[class*="gdpr"]',
        '[class*="cc-banner"]',
        '[id*="cookie-consent"]',
        '[id*="cookie-banner"]',
        '[id*="cookie-notice"]',
        '[id*="consent"]',
        '[id*="gdpr"]',
        '[data-testid*="cookie"]',
        '[aria-label*="cookie"]',
        '[aria-label*="consent"]',
      ];

      for (const selector of consentSelectors) {
        const el = document.querySelector(selector);
        if (el) return { found: true, selector };
      }

      // Also check for common cookie consent library markers
      const bodyText = document.body?.innerText?.toLowerCase() ?? "";
      const hasCookieText =
        bodyText.includes("we use cookies") ||
        bodyText.includes("this website uses cookies") ||
        bodyText.includes("cookie preferences") ||
        bodyText.includes("accept cookies") ||
        bodyText.includes("cookie settings");

      return { found: hasCookieText, selector: hasCookieText ? "body-text" : null };
    });

    // Check if there are cookies set but no consent banner
    const cookies = await page.cookies();
    const hasTrackingCookies = cookies.some(
      (c) =>
        c.name.startsWith("_ga") ||
        c.name.startsWith("_fb") ||
        c.name.startsWith("_gid") ||
        c.name.includes("tracking") ||
        c.name.includes("analytics")
    );

    if (!cookieConsentInfo.found && (hasTrackingCookies || cookies.length > 3)) {
      violations.push({
        id: `privacy-cookie-consent-missing-${randomId()}`,
        category: "privacy",
        severity: "high",
        rule: "cookie-consent-missing",
        message: "No cookie consent banner detected, but cookies are being set. GDPR/ePrivacy compliance may be at risk.",
        url,
        help: "Implement a cookie consent mechanism that obtains user consent before setting non-essential cookies.",
        helpUrl: "https://gdpr.eu/cookies/",
      });
    }

    // 3. Check for third-party trackers
    const pageScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script[src]"));
      const iframes = Array.from(document.querySelectorAll("iframe[src]"));
      const imgs = Array.from(document.querySelectorAll("img[src]"));
      const links = Array.from(document.querySelectorAll("link[href]"));

      return [
        ...scripts.map((s) => (s as HTMLScriptElement).src),
        ...iframes.map((f) => (f as HTMLIFrameElement).src),
        ...imgs.map((i) => (i as HTMLImageElement).src).filter((src) => src.includes("pixel") || src.includes("tr?")),
        ...links.map((l) => (l as HTMLLinkElement).href),
      ].filter(Boolean);
    });

    const detectedTrackers: { name: string; category: string }[] = [];
    const seenTrackers = new Set<string>();

    for (const resource of pageScripts) {
      for (const tracker of TRACKER_PATTERNS) {
        if (tracker.pattern.test(resource) && !seenTrackers.has(tracker.name)) {
          seenTrackers.add(tracker.name);
          detectedTrackers.push({ name: tracker.name, category: tracker.category });
        }
      }
    }

    if (detectedTrackers.length > 0) {
      const trackerNames = detectedTrackers.map((t) => t.name).join(", ");
      const severity = detectedTrackers.length > 5 ? "high" : detectedTrackers.length > 2 ? "medium" : "low";

      violations.push({
        id: `privacy-trackers-detected-${randomId()}`,
        category: "privacy",
        severity,
        rule: "third-party-trackers",
        message: `Found ${detectedTrackers.length} third-party tracker(s): ${trackerNames}`,
        url,
        help: "Ensure all trackers are disclosed in your privacy policy and that user consent is obtained before loading them.",
        helpUrl: "https://gdpr.eu/cookies/",
      });
    }

    // 4. Check HTTPS enforcement
    if (!url.startsWith("https://")) {
      violations.push({
        id: `privacy-no-https-${randomId()}`,
        category: "privacy",
        severity: "critical",
        rule: "no-https",
        message: "Page is not served over HTTPS. User data is transmitted in plain text.",
        url,
        help: "Serve all pages over HTTPS to protect user data in transit.",
        helpUrl: "https://web.dev/why-https-matters/",
      });
    }

    // Also check for mixed content that could leak data
    const mixedContentCount = await page.evaluate(() => {
      const insecure = document.querySelectorAll(
        'img[src^="http:"], script[src^="http:"], iframe[src^="http:"], link[href^="http:"]'
      );
      return insecure.length;
    });

    if (mixedContentCount > 0) {
      violations.push({
        id: `privacy-mixed-content-${randomId()}`,
        category: "privacy",
        severity: "medium",
        rule: "mixed-content-privacy",
        message: `Found ${mixedContentCount} resource(s) loaded over insecure HTTP, which could expose user data.`,
        url,
        help: "Update all resource URLs to use HTTPS to prevent data interception.",
      });
    }

    // 5. Check secure cookie flags
    const insecureSensitiveCookies = cookies.filter((cookie) => {
      const isSensitive =
        cookie.name.toLowerCase().includes("session") ||
        cookie.name.toLowerCase().includes("token") ||
        cookie.name.toLowerCase().includes("auth") ||
        cookie.name.toLowerCase().includes("user");
      return isSensitive && (!cookie.secure || !cookie.httpOnly);
    });

    if (insecureSensitiveCookies.length > 0) {
      const cookieNames = insecureSensitiveCookies.map((c) => c.name).join(", ");
      violations.push({
        id: `privacy-insecure-cookies-${randomId()}`,
        category: "privacy",
        severity: "high",
        rule: "insecure-sensitive-cookies",
        message: `${insecureSensitiveCookies.length} sensitive cookie(s) missing Secure/HttpOnly flags: ${cookieNames}`,
        url,
        help: "Set the Secure and HttpOnly flags on all cookies containing user session or authentication data.",
        helpUrl: "https://owasp.org/www-community/controls/SecureCookieAttribute",
      });
    }

    return { violations, totalChecks: TOTAL_CHECKS };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[privacy] Check failed: ${message}`);

    return {
      violations: [
        {
          id: `privacy-error-${randomId()}`,
          category: "privacy",
          severity: "high",
          rule: "privacy-check-failed",
          message: `Privacy check could not complete: ${message}`,
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
