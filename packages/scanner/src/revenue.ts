import type { Page } from "puppeteer-core";
import type { Violation } from "@preship/shared";

/**
 * Result from revenue potential checks including violations and total check count.
 */
export interface RevenueCheckResult {
  violations: Violation[];
  totalChecks: number;
}

/**
 * Known payment provider script patterns.
 */
const PAYMENT_PROVIDERS: { name: string; pattern: RegExp }[] = [
  { name: "Stripe", pattern: /js\.stripe\.com/i },
  { name: "Paddle", pattern: /cdn\.paddle\.com/i },
  { name: "PayPal", pattern: /paypal\.com\/sdk/i },
  { name: "Lemon Squeezy", pattern: /lemonsqueezy\.com/i },
  { name: "Gumroad", pattern: /gumroad\.com/i },
  { name: "Chargebee", pattern: /js\.chargebee\.com/i },
  { name: "Recurly", pattern: /js\.recurly\.com/i },
];

/**
 * Run comprehensive revenue potential checks against a page.
 *
 * Checks include:
 * - Pricing page link presence
 * - Pricing tier count (if pricing link found)
 * - Free tier presence
 * - Payment integration detection
 * - Documentation links
 * - Status page link
 * - Changelog link
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns RevenueCheckResult with violations and total check count
 */
export async function runRevenueChecks(
  page: Page,
  url: string
): Promise<RevenueCheckResult> {
  const violations: Violation[] = [];
  const TOTAL_CHECKS = 7;

  // 1. Check for pricing page link
  try {
    const hasPricingLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const pricingPatterns = /pricing|plans|price|subscribe/i;
      return links.some((link) => {
        const text = (link.textContent || "").trim();
        const href = link.getAttribute("href") || "";
        return pricingPatterns.test(text) || pricingPatterns.test(href);
      });
    });

    if (!hasPricingLink) {
      violations.push({
        id: `revenue-no-pricing-link-${randomId()}`,
        category: "revenue",
        severity: "high",
        rule: "no-pricing-link",
        message: "No pricing page link found in navigation or footer.",
        url,
        help: "Add a visible 'Pricing' link in your navigation. Visitors expect to easily find pricing information.",
      });
    }
  } catch (error) {
    console.error(`[revenue] Pricing page check failed: ${errorMessage(error)}`);
  }

  // 2. Check pricing tiers on the current page (look for pricing cards/sections)
  try {
    const pricingTierInfo = await page.evaluate(() => {
      // Look for pricing-related sections on the current page
      const pricingSections = document.querySelectorAll(
        '[class*="pricing"], [class*="plan"], [class*="tier"], [id*="pricing"], [id*="plans"]'
      );

      if (pricingSections.length === 0) return { found: false, count: 0 };

      // Count distinct pricing cards within pricing sections
      let tierCount = 0;
      for (const section of pricingSections) {
        const cards = section.querySelectorAll(
          '[class*="card"], [class*="tier"], [class*="plan"], [class*="column"], [class*="option"]'
        );
        if (cards.length > tierCount) {
          tierCount = cards.length;
        }
      }

      return { found: true, count: tierCount };
    });

    if (pricingTierInfo.found) {
      if (pricingTierInfo.count === 1) {
        violations.push({
          id: `revenue-single-tier-${randomId()}`,
          category: "revenue",
          severity: "medium",
          rule: "single-pricing-tier",
          message: "Only 1 pricing tier found. A single tier limits upsell potential.",
          url,
          help: "Consider adding multiple tiers (e.g., Free, Pro, Enterprise) to capture different customer segments and enable upselling.",
        });
      } else if (pricingTierInfo.count > 5) {
        violations.push({
          id: `revenue-too-many-tiers-${randomId()}`,
          category: "revenue",
          severity: "medium",
          rule: "too-many-pricing-tiers",
          message: `Found ${pricingTierInfo.count} pricing tiers. Too many options can cause decision paralysis.`,
          url,
          help: "Simplify your pricing to 2-4 tiers. Highlight one as 'recommended' to guide buyers.",
        });
      }
    }
  } catch (error) {
    console.error(`[revenue] Pricing tiers check failed: ${errorMessage(error)}`);
  }

  // 3. Check for free tier presence
  try {
    const hasFreeTier = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      const freePatterns = [
        /free\s*(plan|tier|forever|trial)/i,
        /\$0/,
        /no credit card/i,
        /start for free/i,
        /free to start/i,
        /get started free/i,
      ];
      return freePatterns.some((pattern) => pattern.test(bodyText));
    });

    // Free tier is a strength — no violation if present, low severity note if missing
    if (!hasFreeTier) {
      violations.push({
        id: `revenue-no-free-tier-${randomId()}`,
        category: "revenue",
        severity: "low",
        rule: "no-free-tier",
        message: "No free tier or free trial messaging detected. A free option can reduce signup friction.",
        url,
        help: "Consider offering a free tier or free trial to lower the barrier to entry and drive adoption.",
      });
    }
  } catch (error) {
    console.error(`[revenue] Free tier check failed: ${errorMessage(error)}`);
  }

  // 4. Check for payment integration
  try {
    const pageScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script[src]"));
      const links = Array.from(document.querySelectorAll("link[href]"));
      return [
        ...scripts.map((s) => (s as HTMLScriptElement).src),
        ...links.map((l) => (l as HTMLLinkElement).href),
      ].filter(Boolean);
    });

    const detectedProviders: string[] = [];
    for (const resource of pageScripts) {
      for (const provider of PAYMENT_PROVIDERS) {
        if (provider.pattern.test(resource) && !detectedProviders.includes(provider.name)) {
          detectedProviders.push(provider.name);
        }
      }
    }

    if (detectedProviders.length === 0) {
      violations.push({
        id: `revenue-no-payment-provider-${randomId()}`,
        category: "revenue",
        severity: "medium",
        rule: "no-payment-provider",
        message: "No payment provider scripts detected (Stripe, Paddle, PayPal, Lemon Squeezy, etc.).",
        url,
        help: "Integrate a payment provider to accept payments. Stripe and Lemon Squeezy are popular choices for SaaS products.",
        helpUrl: "https://stripe.com/docs",
      });
    }
  } catch (error) {
    console.error(`[revenue] Payment integration check failed: ${errorMessage(error)}`);
  }

  // 5. Check for documentation links
  try {
    const hasDocsLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const docsPatterns = /docs|documentation|help|support|guide|faq|knowledge\s*base/i;
      return links.some((link) => {
        const text = (link.textContent || "").trim();
        const href = link.getAttribute("href") || "";
        return docsPatterns.test(text) || docsPatterns.test(href);
      });
    });

    if (!hasDocsLink) {
      violations.push({
        id: `revenue-no-docs-${randomId()}`,
        category: "revenue",
        severity: "medium",
        rule: "no-documentation-link",
        message: "No documentation, help, or FAQ link found. Users need self-serve resources.",
        url,
        help: "Add documentation or an FAQ section so users can find answers without contacting support.",
      });
    }
  } catch (error) {
    console.error(`[revenue] Documentation check failed: ${errorMessage(error)}`);
  }

  // 6. Check for status page link
  try {
    const hasStatusPage = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links.some((link) => {
        const text = (link.textContent || "").trim().toLowerCase();
        const href = (link.getAttribute("href") || "").toLowerCase();
        return (
          text === "status" ||
          text.includes("system status") ||
          /status\./i.test(href) ||
          /statuspage\.io/i.test(href) ||
          /upptime/i.test(href) ||
          /instatus/i.test(href)
        );
      });
    });

    if (!hasStatusPage) {
      violations.push({
        id: `revenue-no-status-page-${randomId()}`,
        category: "revenue",
        severity: "low",
        rule: "no-status-page",
        message: "No status page link found. A status page builds trust with paying customers.",
        url,
        help: "Add a public status page (e.g., via Instatus, Upptime, or Atlassian Statuspage) and link to it from your footer.",
      });
    }
  } catch (error) {
    console.error(`[revenue] Status page check failed: ${errorMessage(error)}`);
  }

  // 7. Check for changelog link
  try {
    const hasChangelog = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const changelogPatterns = /changelog|updates|release\s*notes|what'?s\s*new/i;
      return links.some((link) => {
        const text = (link.textContent || "").trim();
        const href = link.getAttribute("href") || "";
        return changelogPatterns.test(text) || changelogPatterns.test(href);
      });
    });

    if (!hasChangelog) {
      violations.push({
        id: `revenue-no-changelog-${randomId()}`,
        category: "revenue",
        severity: "low",
        rule: "no-changelog",
        message: "No changelog or release notes link found. Users want to see active development.",
        url,
        help: "Add a changelog page to show product momentum and keep users informed about new features and fixes.",
      });
    }
  } catch (error) {
    console.error(`[revenue] Changelog check failed: ${errorMessage(error)}`);
  }

  return { violations, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
