import puppeteer, { type Page, type Browser } from "puppeteer";
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
import { crawlSite } from "./crawler";
import { buildReport } from "./reporter";
import { generateFixSuggestions } from "./fix-suggestions";
import type { ScannerConfig, PerformanceMetrics } from "./types";
import { validateUrl } from "./validate-url";

export { runAccessibilityChecks } from "./accessibility";
export { runSecurityChecks } from "./security";
export {
  collectPerformanceMetrics,
  analyzePerformance,
  calculatePerformanceScore,
} from "./performance";
export { crawlSite } from "./crawler";
export { generateFixSuggestions } from "./fix-suggestions";
export {
  buildReport,
  generateStructuredReport,
  formatTextReport,
} from "./reporter";
export type { StructuredReport, ReportInput } from "./reporter";
export { validateUrl, validateUrlSync, UrlValidationError } from "./validate-url";
export * from "./types";

/** Default timeout per page in milliseconds */
const DEFAULT_PAGE_TIMEOUT = 30000;

/** Maximum time for the entire scan in milliseconds (5 minutes) */
const MAX_SCAN_TIMEOUT = 300000;

/**
 * Main scanner entry point. Takes a URL, launches a headless browser,
 * runs accessibility/security/performance checks across discovered pages,
 * generates fix suggestions, and returns structured results.
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
 *   categories: ['accessibility', 'security'],
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

    // Launch browser with security sandbox disabled for container environments
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      timeout: 30000,
    });

    // Discover pages to scan
    const categories = config.categories ?? DEFAULT_SCAN_OPTIONS.categories;
    let urls: string[];

    if (config.maxPages && config.maxPages > 1) {
      // Use a dedicated page for crawling, then close it
      try {
        const crawlPage = await browser.newPage();
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
    let totalAccessibilityChecks = 0;
    let totalSecurityChecks = 0;
    let totalPerformanceChecks = 0;

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
        if (config.viewport) await scanPage.setViewport(config.viewport);
        if (config.userAgent) await scanPage.setUserAgent(config.userAgent);
        scanPage.setDefaultNavigationTimeout(config.waitForTimeout ?? DEFAULT_PAGE_TIMEOUT);
        scanPage.setDefaultTimeout(config.waitForTimeout ?? DEFAULT_PAGE_TIMEOUT);

        const pageViolations = await scanSinglePage(
          scanPage,
          pageUrl,
          categories,
          config
        );
        await scanPage.close().catch(() => {});
        allViolations.push(...pageViolations.violations);

        if (pageViolations.metrics) {
          lastMetrics = pageViolations.metrics;
        }

        totalAccessibilityChecks += pageViolations.accessibilityChecks;
        totalSecurityChecks += pageViolations.securityChecks;
        totalPerformanceChecks += pageViolations.performanceChecks;
      } catch (pageError) {
        const message =
          pageError instanceof Error ? pageError.message : String(pageError);
        console.error(
          `[scanner] Failed to scan page ${pageUrl}: ${message}`
        );

        // Add violations for each category — severity high because we couldn't verify anything
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
      duration,
      metrics: lastMetrics,
      checksRun: categories,
      totalChecksPerCategory: {
        accessibility: totalAccessibilityChecks > 0 ? totalAccessibilityChecks : 0,
        security: totalSecurityChecks > 0 ? totalSecurityChecks : 0,
        performance: totalPerformanceChecks > 0 ? totalPerformanceChecks : 0,
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
  accessibilityChecks: number;
  securityChecks: number;
  performanceChecks: number;
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

  // Navigate to the page
  const response = await page.goto(pageUrl, {
    waitUntil: "networkidle2",
    timeout: config.waitForTimeout ?? DEFAULT_PAGE_TIMEOUT,
  });

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

  return {
    violations,
    metrics,
    accessibilityChecks,
    securityChecks,
    performanceChecks,
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
