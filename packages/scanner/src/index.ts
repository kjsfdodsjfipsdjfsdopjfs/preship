import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { type Page, type Browser } from "puppeteer-core";
import {
  DEFAULT_SCAN_OPTIONS,
  type ScanResult,
  type Violation,
  type FixSuggestion,
  type CheckCategory,
} from "@preship/shared";
import { runAccessibilityChecks } from "./accessibility";
import { runSecurityChecks } from "./security";
import {
  collectPerformanceMetrics,
  analyzePerformance,
} from "./performance";
import { runSeoChecks } from "./seo";
import { runPrivacyChecks } from "./privacy";
import { runMobileChecks } from "./mobile";
import { crawlSite } from "./crawler";
import { detectChallenge, waitForChallengeResolution } from "./challenge-detector";
import { buildReport } from "./reporter";
import { generateFixSuggestions } from "./fix-suggestions";
import type { ScannerConfig, PerformanceMetrics } from "./types";
import { validateUrl } from "./validate-url";
import { detectFramework } from "./detect-framework";
import type { FrameworkInfo } from "@preship/shared";

// Configure puppeteer-extra with stealth plugin to bypass bot detection
puppeteerExtra.use(StealthPlugin());

export { runAccessibilityChecks } from "./accessibility";
export { runSecurityChecks } from "./security";
export {
  collectPerformanceMetrics,
  analyzePerformance,
  calculatePerformanceScore,
} from "./performance";
export { runSeoChecks } from "./seo";
export { runPrivacyChecks } from "./privacy";
export { runMobileChecks } from "./mobile";
export { crawlSite } from "./crawler";
export { detectChallenge, waitForChallengeResolution } from "./challenge-detector";
export { generateFixSuggestions } from "./fix-suggestions";
export {
  buildReport,
  generateStructuredReport,
  formatTextReport,
} from "./reporter";
export type { StructuredReport, ReportInput } from "./reporter";
export { validateUrl, validateUrlSync, UrlValidationError } from "./validate-url";
export { detectFramework } from "./detect-framework";
export type { FrameworkDetectionResult } from "./detect-framework";
export * from "./types";

/** Default timeout per page in milliseconds */
const DEFAULT_PAGE_TIMEOUT = 30000;

/** Maximum time for the entire scan in milliseconds (5 minutes) */
const MAX_SCAN_TIMEOUT = 300000;

/**
 * Realistic user agents for viewport randomization to avoid bot detection.
 */
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
];

/**
 * Common desktop viewport sizes for randomization.
 */
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
];

/**
 * Pick a random element from an array.
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Main scanner entry point. Takes a URL, launches a headless browser,
 * runs accessibility/security/performance/seo/privacy/mobile checks
 * across discovered pages, generates fix suggestions, and returns
 * structured results.
 *
 * Uses puppeteer-extra with stealth plugin to bypass bot protection
 * on sites like Stripe, GitHub, and Vercel.
 *
 * This is the primary public API for the scanner package.
 *
 * @param url - The URL to scan
 * @param options - Configuration options for the scan
 * @returns Complete ScanResult with violations, scores, and fix suggestions
 *
 * @example
 * ```typescript
 * const result = await scan('https://example.com', {
 *   maxPages: 5,
 *   categories: ['accessibility', 'security', 'seo'],
 *   includeFixSuggestions: true,
 * });
 * console.log(`Score: ${result.overallScore}/100`);
 * console.log(`Violations: ${result.violations.length}`);
 * ```
 */
export async function scan(
  url: string,
  options: ScannerConfig = {}
): Promise<ScanResult> {
  const config: ScannerConfig & typeof DEFAULT_SCAN_OPTIONS = {
    ...DEFAULT_SCAN_OPTIONS,
    ...options,
  };
  const startTime = Date.now();
  let browser: Browser | null = null;

  try {
    // Validate URL against SSRF attacks (blocks private IPs, metadata endpoints, non-HTTP protocols)
    await validateUrl(url);

    // Select a random realistic user agent and viewport for stealth
    const stealthUserAgent = config.userAgent || pickRandom(USER_AGENTS);
    const stealthViewport = config.viewport || pickRandom(VIEWPORTS);

    // Launch browser with puppeteer-extra stealth plugin for bot protection bypass
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
      || process.env.CHROMIUM_PATH
      || "/usr/bin/chromium";

    browser = await puppeteerExtra.launch({
      headless: "new",
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--single-process",
        "--no-zygote",
        "--disable-extensions",
        "--disable-background-networking",
        "--no-first-run",
        "--mute-audio",
        "--hide-scrollbars",
        `--window-size=${stealthViewport.width},${stealthViewport.height}`,
      ],
      timeout: 60000,
      protocolTimeout: 60000,
    }) as unknown as Browser;

    // Discover pages to scan
    const categories = config.categories ?? DEFAULT_SCAN_OPTIONS.categories;
    let urls: string[];

    if (config.maxPages && config.maxPages > 1) {
      // Use a dedicated page for crawling, then close it
      try {
        const crawlPage = await browser.newPage();
        await crawlPage.setUserAgent(stealthUserAgent);
        await crawlPage.setViewport(stealthViewport);
        crawlPage.setDefaultNavigationTimeout(DEFAULT_PAGE_TIMEOUT);
        const crawlResult = await crawlSite(
          crawlPage,
          url,
          config.maxPages ?? DEFAULT_SCAN_OPTIONS.maxPages
        );
        await crawlPage.close().catch(() => {});
        urls = crawlResult.urls.length > 0 ? crawlResult.urls : [url];
      } catch (crawlError) {
        console.error(
          "[scanner] Crawling failed, scanning base URL only:",
          crawlError
        );
        urls = [url];
      }
    } else {
      urls = [url];
    }

    const allViolations: Violation[] = [];
    let lastMetrics: PerformanceMetrics | undefined;
    let detectedFramework: FrameworkInfo | undefined;
    let blockedPages = 0;
    let totalAccessibilityChecks = 0;
    let totalSecurityChecks = 0;
    let totalPerformanceChecks = 0;
    let totalSeoChecks = 0;
    let totalPrivacyChecks = 0;
    let totalMobileChecks = 0;

    // Scan each discovered page (use fresh page per URL to avoid frame issues)
    for (const pageUrl of urls) {
      // Check if we've exceeded the max scan timeout
      if (Date.now() - startTime > MAX_SCAN_TIMEOUT) {
        console.warn(
          `[scanner] Scan timeout reached after ${urls.indexOf(pageUrl)} pages`
        );
        break;
      }

      try {
        // Validate each discovered URL before scanning (prevents SSRF via crafted links)
        await validateUrl(pageUrl);

        const scanPage = await browser.newPage();
        await scanPage.setUserAgent(stealthUserAgent);
        await scanPage.setViewport(stealthViewport);
        scanPage.setDefaultNavigationTimeout(config.waitForTimeout ?? DEFAULT_PAGE_TIMEOUT);
        scanPage.setDefaultTimeout(config.waitForTimeout ?? DEFAULT_PAGE_TIMEOUT);

        const pageViolations = await scanSinglePage(
          scanPage,
          pageUrl,
          categories,
          config
        );
        await scanPage.close().catch(() => {});

        if (pageViolations.blocked) {
          blockedPages++;
          continue;
        }

        allViolations.push(...pageViolations.violations);

        if (pageViolations.metrics) {
          lastMetrics = pageViolations.metrics;
        }

        // Use framework from first successfully scanned page
        if (!detectedFramework && pageViolations.framework?.framework) {
          detectedFramework = pageViolations.framework;
        }

        totalAccessibilityChecks += pageViolations.accessibilityChecks;
        totalSecurityChecks += pageViolations.securityChecks;
        totalPerformanceChecks += pageViolations.performanceChecks;
        totalSeoChecks += pageViolations.seoChecks;
        totalPrivacyChecks += pageViolations.privacyChecks;
        totalMobileChecks += pageViolations.mobileChecks;
      } catch (pageError) {
        const message =
          pageError instanceof Error ? pageError.message : String(pageError);
        console.error(
          `[scanner] Failed to scan page ${pageUrl}: ${message}`
        );

        // Add violations for each category -- severity high because we couldn't verify anything
        const categories = config.categories ?? DEFAULT_SCAN_OPTIONS.categories;
        for (const cat of categories) {
          allViolations.push({
            id: `scan-error-${cat}-${Math.random().toString(36).slice(2, 8)}`,
            category: cat,
            severity: "high",
            rule: "page-scan-error",
            message: `Could not scan page: ${message}`,
            url: pageUrl,
          });
        }
        // Count failed pages as having checks that failed
        totalAccessibilityChecks += 50;
        totalSecurityChecks += 15;
        totalPerformanceChecks += 10;
        totalSeoChecks += 10;
        totalPrivacyChecks += 5;
        totalMobileChecks += 6;
      }
    }

    // Generate fix suggestions
    let suggestions: FixSuggestion[] = [];
    if (config.includeFixSuggestions !== false) {
      try {
        suggestions = await generateFixSuggestions(allViolations);
      } catch (fixError) {
        console.error("[scanner] Fix suggestion generation failed:", fixError);
      }
    }

    const duration = Date.now() - startTime;

    // Build and return the final report
    return buildReport({
      id: crypto.randomUUID(),
      projectId: options.projectId ?? "",
      url,
      violations: allViolations,
      suggestions,
      pagesScanned: urls.length,
      blockedPages,
      duration,
      metrics: lastMetrics,
      framework: detectedFramework,
      checksRun: categories,
      totalChecksPerCategory: {
        accessibility: totalAccessibilityChecks > 0 ? totalAccessibilityChecks : 0,
        security: totalSecurityChecks > 0 ? totalSecurityChecks : 0,
        performance: totalPerformanceChecks > 0 ? totalPerformanceChecks : 0,
        seo: totalSeoChecks > 0 ? totalSeoChecks : 0,
        privacy: totalPrivacyChecks > 0 ? totalPrivacyChecks : 0,
        mobile: totalMobileChecks > 0 ? totalMobileChecks : 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : (error as any)?.message ?? JSON.stringify(error) ?? String(error);
    const duration = Date.now() - startTime;

    // Return a failed scan result rather than throwing
    return {
      id: crypto.randomUUID(),
      projectId: options.projectId ?? "",
      url,
      status: "failed",
      overallScore: 0,
      categories: [],
      violations: [
        {
          id: `scan-fatal-${Math.random().toString(36).slice(2, 8)}`,
          category: "accessibility",
          severity: "critical",
          rule: "scan-failed",
          message: `Scan failed: ${message}`,
          url,
        },
      ],
      suggestions: [],
      pagesScanned: 0,
      duration,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  } finally {
    // Always clean up the browser instance
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Browser may already be closed; ignore cleanup errors
      }
    }
  }
}

/**
 * Internal result type for single-page scans, includes check counts
 * for accurate scoring.
 */
interface SinglePageResult {
  violations: Violation[];
  metrics?: PerformanceMetrics;
  blocked?: boolean;
  blockedBy?: "cloudflare" | "vercel" | "generic";
  framework?: FrameworkInfo;
  accessibilityChecks: number;
  securityChecks: number;
  performanceChecks: number;
  seoChecks: number;
  privacyChecks: number;
  mobileChecks: number;
}

/**
 * Scan a single page with all selected check categories.
 *
 * Handles navigation, waiting for content, and running each check
 * category with proper error isolation (one failing check doesn't
 * prevent others from running).
 *
 * @param page - Puppeteer page instance
 * @param pageUrl - URL to scan
 * @param categories - Which check categories to run
 * @param config - Scanner configuration
 * @returns Violations and metrics for this page
 */
async function scanSinglePage(
  page: Page,
  pageUrl: string,
  categories: CheckCategory[],
  config: ScannerConfig & typeof DEFAULT_SCAN_OPTIONS
): Promise<SinglePageResult> {
  const violations: Violation[] = [];
  let metrics: PerformanceMetrics | undefined;
  let accessibilityChecks = 0;
  let securityChecks = 0;
  let performanceChecks = 0;
  let seoChecks = 0;
  let privacyChecks = 0;
  let mobileChecks = 0;

  // Navigate to the page
  const response = await page.goto(pageUrl, {
    waitUntil: "networkidle0",
    timeout: config.waitForTimeout ?? DEFAULT_PAGE_TIMEOUT,
  });

  // Check for bot challenge pages (Cloudflare, Vercel, etc.)
  const challenge = await detectChallenge(page);
  if (challenge.isChallenge) {
    const resolved = await waitForChallengeResolution(page);
    if (!resolved) {
      console.warn(`[scanner] Page blocked by ${challenge.provider}: ${pageUrl}`);
      // Page is blocked — skip heavy checks to avoid misleading score-0 results
      return {
        violations: [],
        metrics: undefined,
        blocked: true,
        blockedBy: challenge.provider ?? "generic",
        accessibilityChecks: 0,
        securityChecks: 0,
        performanceChecks: 0,
        seoChecks: 0,
        privacyChecks: 0,
        mobileChecks: 0,
      };
    }
  }

  // Wait for main content to render (SPAs need hydration time)
  try {
    await page.waitForSelector("main, #__next, #root, [role='main'], article, .content", { timeout: 5000 });
  } catch {
    // No main content selector found — continue with checks anyway
  }

  // Wait for optional selector if configured
  if (config.waitForSelector) {
    try {
      await page.waitForSelector(config.waitForSelector, {
        timeout: 10000,
      });
    } catch {
      console.warn(
        `[scanner] Selector "${config.waitForSelector}" not found on ${pageUrl}`
      );
    }
  }

  // Detect framework / tech stack
  let frameworkInfo: FrameworkInfo | undefined;
  try {
    const poweredBy = response?.headers()?.["x-powered-by"] ?? null;
    frameworkInfo = await detectFramework(page, poweredBy);
  } catch (error) {
    console.error(`[scanner] Framework detection failed on ${pageUrl}:`, error);
  }

  // Run accessibility checks
  if (categories.includes("accessibility")) {
    try {
      const a11yViolations = await runAccessibilityChecks(page, pageUrl);
      violations.push(...a11yViolations);
      accessibilityChecks += 50;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[scanner] Accessibility check failed on ${pageUrl}:`, error);
      violations.push({
        id: `a11y-error-${Math.random().toString(36).slice(2, 8)}`,
        category: "accessibility",
        severity: "high",
        rule: "check-failed",
        message: `Accessibility check failed: ${msg}`,
        url: pageUrl,
      });
      accessibilityChecks += 50;
    }
  }

  // Run security checks
  if (categories.includes("security")) {
    try {
      const secResult = await runSecurityChecks(page, response, pageUrl);
      violations.push(...secResult.violations);
      securityChecks +=
        secResult.headersPresent.length + secResult.headersMissing.length + 5;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[scanner] Security check failed on ${pageUrl}:`, error);
      violations.push({
        id: `sec-error-${Math.random().toString(36).slice(2, 8)}`,
        category: "security",
        severity: "high",
        rule: "check-failed",
        message: `Security check failed: ${msg}`,
        url: pageUrl,
      });
      securityChecks += 15;
    }
  }

  // Run performance checks
  if (categories.includes("performance")) {
    try {
      metrics = await collectPerformanceMetrics(page);
      const perfViolations = await analyzePerformance(metrics, pageUrl, page);
      violations.push(...perfViolations);
      performanceChecks += 10;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[scanner] Performance check failed on ${pageUrl}:`, error);
      violations.push({
        id: `perf-error-${Math.random().toString(36).slice(2, 8)}`,
        category: "performance",
        severity: "high",
        rule: "check-failed",
        message: `Performance check failed: ${msg}`,
        url: pageUrl,
      });
      performanceChecks += 10;
    }
  }

  // Run SEO checks
  if (categories.includes("seo")) {
    try {
      const seoResult = await runSeoChecks(page, pageUrl);
      violations.push(...seoResult.violations);
      seoChecks += seoResult.totalChecks;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[scanner] SEO check failed on ${pageUrl}:`, error);
      violations.push({
        id: `seo-error-${Math.random().toString(36).slice(2, 8)}`,
        category: "seo",
        severity: "high",
        rule: "check-failed",
        message: `SEO check failed: ${msg}`,
        url: pageUrl,
      });
      seoChecks += 10;
    }
  }

  // Run privacy checks
  if (categories.includes("privacy")) {
    try {
      const privacyResult = await runPrivacyChecks(page, pageUrl);
      violations.push(...privacyResult.violations);
      privacyChecks += privacyResult.totalChecks;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[scanner] Privacy check failed on ${pageUrl}:`, error);
      violations.push({
        id: `privacy-error-${Math.random().toString(36).slice(2, 8)}`,
        category: "privacy",
        severity: "high",
        rule: "check-failed",
        message: `Privacy check failed: ${msg}`,
        url: pageUrl,
      });
      privacyChecks += 5;
    }
  }

  // Run mobile checks (uses its own viewport, so run last)
  if (categories.includes("mobile")) {
    try {
      const mobileResult = await runMobileChecks(page, pageUrl);
      violations.push(...mobileResult.violations);
      mobileChecks += mobileResult.totalChecks;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[scanner] Mobile check failed on ${pageUrl}:`, error);
      violations.push({
        id: `mobile-error-${Math.random().toString(36).slice(2, 8)}`,
        category: "mobile",
        severity: "high",
        rule: "check-failed",
        message: `Mobile check failed: ${msg}`,
        url: pageUrl,
      });
      mobileChecks += 6;
    }
  }

  return {
    violations,
    metrics,
    framework: frameworkInfo,
    accessibilityChecks,
    securityChecks,
    performanceChecks,
    seoChecks,
    privacyChecks,
    mobileChecks,
  };
}

/**
 * Scan a single URL without crawling (useful for quick checks).
 *
 * This is a convenience function that scans just one page without
 * discovering additional pages via crawling.
 *
 * @param url - The URL to scan
 * @param options - Scanner configuration
 * @returns Complete ScanResult for the single page
 */
export async function scanSingleUrl(
  url: string,
  options: ScannerConfig = {}
): Promise<ScanResult> {
  return scan(url, { ...options, maxPages: 1 });
}
