import type { Page } from "puppeteer-core";
import type { Violation, CheckResult, CheckCategory } from "@preship/shared";

/**
 * Result from revenue potential checks including violations, check results, and total check count.
 */
export interface RevenueCheckResult {
  violations: Violation[];
  checkResults: CheckResult[];
  totalChecks: number;
}

const CATEGORY: CheckCategory = "revenue";

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
 * Run 20 comprehensive revenue potential checks against a page.
 * Uses CUMULATIVE scoring: each check earns points if passed, 0 if not.
 *
 * @param page - A Puppeteer Page that has already navigated to the target URL
 * @param url - The URL being checked (used in violation reports)
 * @returns RevenueCheckResult with violations, checkResults, and total check count
 */
export async function runRevenueChecks(
  page: Page,
  url: string
): Promise<RevenueCheckResult> {
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

  // 1. Pricing page with visible prices (8pts)
  try {
    const passed = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const hasPricingLink = links.some(l => {
        const text = (l.textContent || "").trim().toLowerCase();
        const href = (l.getAttribute("href") || "").toLowerCase();
        return /pricing|plans|price/.test(text) || /pricing|plans|price/.test(href);
      });
      const bodyText = document.body?.innerText ?? "";
      const hasPriceNumbers = /\$\d|€\d|£\d/i.test(bodyText);
      return hasPricingLink || hasPriceNumbers;
    });
    addCheck("revenue-pricing-page", "Pricing Page with Prices", passed, 8,
      "Add a visible Pricing link and show actual prices, not just 'contact us'.");
  } catch { addCheck("revenue-pricing-page", "Pricing Page with Prices", false, 8); }

  // 2. Multiple pricing tiers (5pts)
  try {
    const passed = await page.evaluate(() => {
      const sections = document.querySelectorAll('[class*="pricing"], [class*="plan"], [class*="tier"], [id*="pricing"], [id*="plans"]');
      for (const section of sections) {
        const cards = section.querySelectorAll('[class*="card"], [class*="tier"], [class*="plan"], [class*="column"], [class*="option"]');
        if (cards.length >= 2 && cards.length <= 4) return true;
      }
      return false;
    });
    addCheck("revenue-multiple-tiers", "Multiple Pricing Tiers", passed, 5,
      "Offer 2-4 pricing tiers to capture different customer segments and enable upselling.");
  } catch { addCheck("revenue-multiple-tiers", "Multiple Pricing Tiers", false, 5); }

  // 3. Free tier or trial available (5pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      return /free\s*(plan|tier|forever|trial)|start for free|free to start|get started free|no credit card|\$0/i.test(bodyText);
    });
    addCheck("revenue-free-tier", "Free Tier or Trial", passed, 5,
      "Offer a free tier or trial to lower the barrier to entry and drive adoption.");
  } catch { addCheck("revenue-free-tier", "Free Tier or Trial", false, 5); }

  // 4. Annual billing discount (5pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      return /annual|yearly|per year|\/year|billed annually|save\s*\d+%|monthly.*annual|annual.*monthly/i.test(bodyText);
    });
    addCheck("revenue-annual-billing", "Annual Billing Discount", passed, 5,
      "Offer annual billing with a discount (e.g., 'Save 20% with annual') to improve retention.");
  } catch { addCheck("revenue-annual-billing", "Annual Billing Discount", false, 5); }

  // 5. Enterprise tier (3pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      return /enterprise|custom plan|contact sales|talk to sales|custom pricing/i.test(bodyText);
    });
    addCheck("revenue-enterprise-tier", "Enterprise Tier", passed, 3,
      "Add an enterprise or custom tier option for larger customers.");
  } catch { addCheck("revenue-enterprise-tier", "Enterprise Tier", false, 3); }

  // 6. Payment integration detected (8pts)
  try {
    const pageScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script[src]"));
      const links = Array.from(document.querySelectorAll("link[href]"));
      return [
        ...scripts.map(s => (s as HTMLScriptElement).src),
        ...links.map(l => (l as HTMLLinkElement).href),
      ].filter(Boolean);
    });
    const detected = pageScripts.some(resource =>
      PAYMENT_PROVIDERS.some(p => p.pattern.test(resource))
    );
    addCheck("revenue-payment-integration", "Payment Integration", detected, 8,
      "Integrate a payment provider (Stripe, Paddle, PayPal, LemonSqueezy) to accept payments.");
  } catch { addCheck("revenue-payment-integration", "Payment Integration", false, 8); }

  // 7. Feature comparison table (5pts)
  try {
    const passed = await page.evaluate(() => {
      const tables = document.querySelectorAll("table");
      for (const table of tables) {
        const text = (table.textContent ?? "").toLowerCase();
        if (/feature|included|check|plan|tier|free|pro|enterprise/i.test(text)) return true;
      }
      const comparisonSections = document.querySelectorAll('[class*="comparison"], [class*="feature-table"], [class*="plan-feature"]');
      return comparisonSections.length > 0;
    });
    addCheck("revenue-feature-comparison", "Feature Comparison Table", passed, 5,
      "Add a feature comparison table to clearly show what each pricing tier includes.");
  } catch { addCheck("revenue-feature-comparison", "Feature Comparison Table", false, 5); }

  // 8. Money-back guarantee (3pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      return /money.?back|refund|guarantee|risk.?free|no.?risk/i.test(bodyText);
    });
    addCheck("revenue-money-back", "Money-Back Guarantee", passed, 3,
      "Mention a money-back guarantee or refund policy on the pricing page to reduce purchase anxiety.");
  } catch { addCheck("revenue-money-back", "Money-Back Guarantee", false, 3); }

  // 9. FAQ on pricing page (3pts)
  try {
    const passed = await page.evaluate(() => {
      const body = document.body?.innerHTML?.toLowerCase() ?? "";
      const hasFAQ = /faq|frequently asked|common questions/i.test(body);
      const hasAccordion = document.querySelectorAll('details, [class*="faq"], [class*="accordion"]').length > 0;
      return hasFAQ || hasAccordion;
    });
    addCheck("revenue-pricing-faq", "Pricing FAQ", passed, 3,
      "Add a FAQ section near pricing to address common billing questions.");
  } catch { addCheck("revenue-pricing-faq", "Pricing FAQ", false, 3); }

  // 10. Currency localization (3pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      const hasMultipleCurrencies = /€|£|¥|₹|R\$|A\$/i.test(bodyText);
      const hasCurrencySelector = document.querySelectorAll('[class*="currency"], [id*="currency"]').length > 0;
      return hasMultipleCurrencies || hasCurrencySelector;
    });
    addCheck("revenue-currency-localization", "Currency Localization", passed, 3,
      "Support multiple currencies or auto-detect visitor currency for international customers.");
  } catch { addCheck("revenue-currency-localization", "Currency Localization", false, 3); }

  // 11. Payment security badges (3pts)
  try {
    const passed = await page.evaluate(() => {
      const body = document.body?.innerHTML?.toLowerCase() ?? "";
      return /pci|ssl|secure payment|256.bit|encrypted|trust badge|verified secure/i.test(body) ||
        document.querySelectorAll('[alt*="secure"], [alt*="pci"], [alt*="ssl"], [class*="payment-badge"]').length > 0;
    });
    addCheck("revenue-payment-badges", "Payment Security Badges", passed, 3,
      "Display payment security badges (SSL, PCI) near checkout to build trust.");
  } catch { addCheck("revenue-payment-badges", "Payment Security Badges", false, 3); }

  // 12. Clear upgrade path (5pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      return /upgrade|get started|start free|try.*pro|unlock|go premium/i.test(bodyText);
    });
    addCheck("revenue-upgrade-path", "Clear Upgrade Path", passed, 5,
      "Show a clear path from free to paid (e.g., 'Upgrade to Pro') to drive conversions.");
  } catch { addCheck("revenue-upgrade-path", "Clear Upgrade Path", false, 5); }

  // 13. Add-ons or usage-based options (3pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      return /add.?on|usage.?based|pay.?as.?you.?go|per\s*(seat|user|unit|api call|request)|metered/i.test(bodyText);
    });
    addCheck("revenue-addons", "Add-ons/Usage-Based Options", passed, 3,
      "Offer add-ons or usage-based pricing for flexible monetization beyond fixed tiers.");
  } catch { addCheck("revenue-addons", "Add-ons/Usage-Based Options", false, 3); }

  // 14. Billing FAQ or help (3pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText?.toLowerCase() ?? "";
      return /billing|how.*charged|when.*charged|payment method|billing cycle/i.test(bodyText);
    });
    addCheck("revenue-billing-faq", "Billing FAQ/Help", passed, 3,
      "Add billing FAQ content explaining how billing works, when users are charged, etc.");
  } catch { addCheck("revenue-billing-faq", "Billing FAQ/Help", false, 3); }

  // 15. Tax handling mentioned (3pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText?.toLowerCase() ?? "";
      return /vat|tax|gst|sales tax|tax.?inclusive|tax.?exclusive/i.test(bodyText);
    });
    addCheck("revenue-tax-handling", "Tax Handling", passed, 3,
      "Mention VAT/tax handling on the pricing page for international customers.");
  } catch { addCheck("revenue-tax-handling", "Tax Handling", false, 3); }

  // 16. Payment methods listed (3pts)
  try {
    const passed = await page.evaluate(() => {
      const body = document.body?.innerHTML?.toLowerCase() ?? "";
      return /visa|mastercard|amex|paypal|wire transfer|bank transfer|apple pay|google pay/i.test(body) ||
        document.querySelectorAll('[alt*="visa"], [alt*="mastercard"], [alt*="paypal"], [class*="payment-method"]').length > 0;
    });
    addCheck("revenue-payment-methods", "Payment Methods Listed", passed, 3,
      "List accepted payment methods (cards, PayPal, wire) to set clear expectations.");
  } catch { addCheck("revenue-payment-methods", "Payment Methods Listed", false, 3); }

  // 17. Revenue model clear from homepage (5pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      return /\$\d|€\d|£\d|pricing|subscribe|buy|purchase|free trial|start free|get started/i.test(bodyText);
    });
    addCheck("revenue-model-homepage", "Revenue Model Clear from Homepage", passed, 5,
      "Make it clear from the homepage how the business makes money (pricing links, CTAs, etc.).");
  } catch { addCheck("revenue-model-homepage", "Revenue Model Clear from Homepage", false, 5); }

  // 18. Subscription management mentioned (3pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText?.toLowerCase() ?? "";
      const links = Array.from(document.querySelectorAll("a"));
      const hasManageLink = links.some(l => {
        const text = (l.textContent ?? "").toLowerCase();
        const href = (l.getAttribute("href") ?? "").toLowerCase();
        return /manage.*subscription|cancel.*subscription|billing.*portal|account.*settings/i.test(text) ||
          /billing|subscription|account/i.test(href);
      });
      return hasManageLink || /manage.*subscription|cancel anytime|cancel.*subscription/i.test(bodyText);
    });
    addCheck("revenue-subscription-mgmt", "Subscription Management", passed, 3,
      "Mention how users can manage or cancel subscriptions to build trust.");
  } catch { addCheck("revenue-subscription-mgmt", "Subscription Management", false, 3); }

  // 19. Invoice/receipt capability (3pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText?.toLowerCase() ?? "";
      return /invoice|receipt|billing history|download.*receipt|tax.*receipt/i.test(bodyText);
    });
    addCheck("revenue-invoices", "Invoice/Receipt Capability", passed, 3,
      "Mention invoice or receipt capability for business customers who need documentation.");
  } catch { addCheck("revenue-invoices", "Invoice/Receipt Capability", false, 3); }

  // 20. Discount/coupon system (3pts)
  try {
    const passed = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      const hasPromoInput = document.querySelectorAll(
        'input[name*="coupon"], input[name*="promo"], input[name*="discount"], input[placeholder*="coupon"], input[placeholder*="promo"]'
      ).length > 0;
      return hasPromoInput || /coupon|promo code|discount code|special offer|limited.*offer/i.test(bodyText);
    });
    addCheck("revenue-discount-system", "Discount/Coupon System", passed, 3,
      "Add promo code input or seasonal offers to incentivize purchases.");
  } catch { addCheck("revenue-discount-system", "Discount/Coupon System", false, 3); }

  return { violations, checkResults, totalChecks: TOTAL_CHECKS };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
