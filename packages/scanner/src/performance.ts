import type { Page } from "puppeteer-core";
import type { Violation } from "@preship/shared";
import type { PerformanceMetrics } from "./types";

/**
 * Core Web Vitals thresholds (in milliseconds unless noted).
 * Based on Google's Web Vitals guidelines.
 */
const THRESHOLDS = {
  FCP_GOOD: 1800,
  FCP_POOR: 3000,
  LCP_GOOD: 2500,
  LCP_POOR: 4000,
  CLS_GOOD: 0.1,
  CLS_POOR: 0.25,
  TBT_GOOD: 200,
  TBT_POOR: 600,
  TTFB_GOOD: 800,
  TTFB_POOR: 1800,
  TTI_GOOD: 3800,
  TTI_POOR: 7300,
  PAGE_WEIGHT_WARNING: 3 * 1024 * 1024, // 3MB
  PAGE_WEIGHT_CRITICAL: 6 * 1024 * 1024, // 6MB
  REQUEST_COUNT_WARNING: 80,
  REQUEST_COUNT_CRITICAL: 150,
  DOM_NODES_WARNING: 1500,
  DOM_NODES_CRITICAL: 3000,
};

/**
 * Collect Core Web Vitals and performance metrics from a page.
 *
 * Uses the Performance API, PerformanceObserver, and Chrome DevTools
 * Protocol (CDP) to gather comprehensive metrics including:
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 * - Cumulative Layout Shift (CLS)
 * - Total Blocking Time (TBT)
 * - Time to Interactive (TTI)
 * - Transfer size and DOM node count
 *
 * @param page - A Puppeteer Page that has navigated to the target URL
 * @returns Collected performance metrics
 */
export async function collectPerformanceMetrics(
  page: Page
): Promise<PerformanceMetrics> {
  // Collect basic metrics from the Performance API
  const baseMetrics = await page.evaluate(() => {
    const perfEntries = performance.getEntriesByType(
      "navigation"
    ) as PerformanceNavigationTiming[];
    const paintEntries = performance.getEntriesByType("paint");

    const fcp =
      paintEntries.find((e) => e.name === "first-contentful-paint")
        ?.startTime ?? 0;

    const navEntry = perfEntries[0];
    const transferSize = navEntry?.transferSize ?? 0;
    const domNodes = document.querySelectorAll("*").length;

    // Calculate TTFB from navigation timing
    const ttfb = navEntry
      ? navEntry.responseStart - navEntry.requestStart
      : 0;

    return {
      firstContentfulPaint: fcp,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      totalBlockingTime: 0,
      timeToInteractive: navEntry?.domInteractive ?? 0,
      transferSize,
      domNodes,
      ttfb,
    };
  });

  // Collect LCP via PerformanceObserver (needs time to settle)
  const lcp = await page
    .evaluate(() => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0;
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              lcpValue = lastEntry.startTime;
            }
          });
          observer.observe({
            type: "largest-contentful-paint",
            buffered: true,
          });
          setTimeout(() => {
            observer.disconnect();
            resolve(lcpValue);
          }, 3000);
        } catch {
          resolve(0);
        }
      });
    })
    .catch(() => 0);

  // Collect CLS via PerformanceObserver
  const cls = await page
    .evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // @ts-expect-error Layout shift entry type
              if (!entry.hadRecentInput) {
                // @ts-expect-error Layout shift entry type
                clsValue += entry.value;
              }
            }
          });
          observer.observe({ type: "layout-shift", buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 2000);
        } catch {
          resolve(0);
        }
      });
    })
    .catch(() => 0);

  // Collect TBT by measuring long tasks
  const tbt = await page
    .evaluate(() => {
      return new Promise<number>((resolve) => {
        let totalBlockingTime = 0;
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // Long tasks are > 50ms; blocking time is the excess
              if (entry.duration > 50) {
                totalBlockingTime += entry.duration - 50;
              }
            }
          });
          observer.observe({ type: "longtask", buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(totalBlockingTime);
          }, 3000);
        } catch {
          resolve(0);
        }
      });
    })
    .catch(() => 0);

  return {
    firstContentfulPaint: baseMetrics.firstContentfulPaint,
    largestContentfulPaint: lcp,
    cumulativeLayoutShift: cls,
    totalBlockingTime: tbt,
    timeToInteractive: baseMetrics.timeToInteractive,
    transferSize: baseMetrics.transferSize,
    domNodes: baseMetrics.domNodes,
  };
}

/**
 * Analyze performance metrics and page resources, generating violations
 * for any issues found.
 *
 * Checks include:
 * - Core Web Vitals (LCP, CLS, FCP, TBT)
 * - DOM complexity
 * - Total page weight
 * - Number of HTTP requests
 * - Render-blocking resources
 * - Image optimization (lazy loading, dimensions, format)
 *
 * @param metrics - Performance metrics collected from the page
 * @param url - The URL being analyzed
 * @param page - The Puppeteer page (used for resource analysis)
 * @returns Array of performance violations
 */
export async function analyzePerformance(
  metrics: PerformanceMetrics,
  url: string,
  page?: Page
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // --- Core Web Vitals ---

  // LCP check
  if (metrics.largestContentfulPaint > THRESHOLDS.LCP_POOR) {
    violations.push({
      id: `perf-lcp-poor-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "critical",
      rule: "lcp-poor",
      message: `Largest Contentful Paint is ${(metrics.largestContentfulPaint / 1000).toFixed(1)}s (should be < 2.5s)`,
      url,
      help: "Optimize images, reduce server response time, eliminate render-blocking resources, and use preload for critical assets.",
      helpUrl: "https://web.dev/lcp/",
    });
  } else if (metrics.largestContentfulPaint > THRESHOLDS.LCP_GOOD) {
    violations.push({
      id: `perf-lcp-needs-improvement-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "medium",
      rule: "lcp-needs-improvement",
      message: `Largest Contentful Paint is ${(metrics.largestContentfulPaint / 1000).toFixed(1)}s (should be < 2.5s)`,
      url,
      help: "Consider optimizing the largest visible element's load time.",
      helpUrl: "https://web.dev/lcp/",
    });
  }

  // FCP check
  if (metrics.firstContentfulPaint > THRESHOLDS.FCP_POOR) {
    violations.push({
      id: `perf-fcp-poor-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "high",
      rule: "fcp-poor",
      message: `First Contentful Paint is ${(metrics.firstContentfulPaint / 1000).toFixed(1)}s (should be < 1.8s)`,
      url,
      help: "Reduce server response time, eliminate render-blocking resources, and optimize critical rendering path.",
      helpUrl: "https://web.dev/fcp/",
    });
  } else if (metrics.firstContentfulPaint > THRESHOLDS.FCP_GOOD) {
    violations.push({
      id: `perf-fcp-needs-improvement-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "medium",
      rule: "fcp-needs-improvement",
      message: `First Contentful Paint is ${(metrics.firstContentfulPaint / 1000).toFixed(1)}s (should be < 1.8s)`,
      url,
      helpUrl: "https://web.dev/fcp/",
    });
  }

  // CLS check
  if (metrics.cumulativeLayoutShift > THRESHOLDS.CLS_POOR) {
    violations.push({
      id: `perf-cls-poor-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "high",
      rule: "cls-poor",
      message: `Cumulative Layout Shift is ${metrics.cumulativeLayoutShift.toFixed(3)} (should be < 0.1)`,
      url,
      help: "Add explicit dimensions to images/videos, avoid inserting content above existing content, and use CSS containment.",
      helpUrl: "https://web.dev/cls/",
    });
  } else if (metrics.cumulativeLayoutShift > THRESHOLDS.CLS_GOOD) {
    violations.push({
      id: `perf-cls-needs-improvement-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "medium",
      rule: "cls-needs-improvement",
      message: `Cumulative Layout Shift is ${metrics.cumulativeLayoutShift.toFixed(3)} (should be < 0.1)`,
      url,
      helpUrl: "https://web.dev/cls/",
    });
  }

  // TBT check (proxy for INP/FID)
  if (metrics.totalBlockingTime > THRESHOLDS.TBT_POOR) {
    violations.push({
      id: `perf-tbt-poor-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "high",
      rule: "tbt-poor",
      message: `Total Blocking Time is ${Math.round(metrics.totalBlockingTime)}ms (should be < 200ms)`,
      url,
      help: "Reduce JavaScript execution time, break up long tasks, and optimize third-party scripts.",
      helpUrl: "https://web.dev/tbt/",
    });
  } else if (metrics.totalBlockingTime > THRESHOLDS.TBT_GOOD) {
    violations.push({
      id: `perf-tbt-needs-improvement-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "medium",
      rule: "tbt-needs-improvement",
      message: `Total Blocking Time is ${Math.round(metrics.totalBlockingTime)}ms (should be < 200ms)`,
      url,
      helpUrl: "https://web.dev/tbt/",
    });
  }

  // DOM size check
  if (metrics.domNodes > THRESHOLDS.DOM_NODES_CRITICAL) {
    violations.push({
      id: `perf-dom-size-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "high",
      rule: "excessive-dom-size",
      message: `DOM has ${metrics.domNodes} nodes (recommended < 1500)`,
      url,
      help: "Reduce DOM complexity by removing unnecessary elements, using virtual scrolling, or lazy loading content.",
      helpUrl: "https://developer.chrome.com/docs/lighthouse/performance/dom-size/",
    });
  } else if (metrics.domNodes > THRESHOLDS.DOM_NODES_WARNING) {
    violations.push({
      id: `perf-dom-size-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "medium",
      rule: "large-dom-size",
      message: `DOM has ${metrics.domNodes} nodes (recommended < 1500)`,
      url,
      help: "Consider simplifying the DOM structure.",
    });
  }

  // Transfer size check
  if (metrics.transferSize > THRESHOLDS.PAGE_WEIGHT_CRITICAL) {
    violations.push({
      id: `perf-transfer-size-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "high",
      rule: "critical-page-weight",
      message: `Page transfer size is ${(metrics.transferSize / (1024 * 1024)).toFixed(1)}MB (recommended < 3MB)`,
      url,
      help: "Compress images, enable text compression (gzip/brotli), tree-shake JavaScript, and remove unused CSS.",
    });
  } else if (metrics.transferSize > THRESHOLDS.PAGE_WEIGHT_WARNING) {
    violations.push({
      id: `perf-transfer-size-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "medium",
      rule: "large-transfer-size",
      message: `Page transfer size is ${(metrics.transferSize / (1024 * 1024)).toFixed(1)}MB (recommended < 3MB)`,
      url,
    });
  }

  // --- Page-level resource checks (require page instance) ---

  if (page) {
    try {
      // Check for render-blocking resources
      const renderBlockingViolations = await checkRenderBlockingResources(
        page,
        url
      );
      violations.push(...renderBlockingViolations);

      // Check image optimization
      const imageViolations = await checkImageOptimization(page, url);
      violations.push(...imageViolations);

      // Check number of HTTP requests
      const requestViolations = await checkRequestCount(page, url);
      violations.push(...requestViolations);
    } catch (error) {
      console.error("[performance] Resource analysis failed:", error);
    }
  }

  return violations;
}

/**
 * Check for render-blocking CSS and synchronous JS in the <head>.
 */
async function checkRenderBlockingResources(
  page: Page,
  url: string
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const blockingResources = await page.evaluate(() => {
    const blocking: { type: string; src: string; html: string }[] = [];

    // Synchronous scripts in <head> (no async/defer)
    document
      .querySelectorAll("head script[src]:not([async]):not([defer]):not([type='module'])")
      .forEach((el) => {
        blocking.push({
          type: "script",
          src: (el as HTMLScriptElement).src || "",
          html: el.outerHTML.substring(0, 200),
        });
      });

    // Render-blocking stylesheets (without media query or preload)
    document
      .querySelectorAll(
        'head link[rel="stylesheet"]:not([media]):not([disabled])'
      )
      .forEach((el) => {
        const media = (el as HTMLLinkElement).media;
        if (!media || media === "all" || media === "") {
          blocking.push({
            type: "stylesheet",
            src: (el as HTMLLinkElement).href || "",
            html: el.outerHTML.substring(0, 200),
          });
        }
      });

    return blocking;
  });

  if (blockingResources.length > 3) {
    const scripts = blockingResources.filter((r) => r.type === "script");
    const styles = blockingResources.filter((r) => r.type === "stylesheet");

    if (scripts.length > 0) {
      violations.push({
        id: `perf-render-blocking-scripts-${Math.random().toString(36).slice(2, 8)}`,
        category: "performance",
        severity: "high",
        rule: "render-blocking-scripts",
        message: `Found ${scripts.length} render-blocking script(s) in <head>`,
        element: scripts
          .map((s) => s.html)
          .join("\n")
          .substring(0, 500),
        url,
        help: 'Add "async" or "defer" attribute to non-critical scripts, or move them to the end of <body>.',
        helpUrl:
          "https://web.dev/render-blocking-resources/",
      });
    }

    if (styles.length > 3) {
      violations.push({
        id: `perf-render-blocking-styles-${Math.random().toString(36).slice(2, 8)}`,
        category: "performance",
        severity: "medium",
        rule: "render-blocking-stylesheets",
        message: `Found ${styles.length} render-blocking stylesheet(s)`,
        url,
        help: "Inline critical CSS, defer non-critical stylesheets, or use media queries to conditionally load CSS.",
        helpUrl:
          "https://web.dev/render-blocking-resources/",
      });
    }
  }

  return violations;
}

/**
 * Check images for optimization issues: missing lazy loading,
 * missing dimensions, unoptimized formats.
 */
async function checkImageOptimization(
  page: Page,
  url: string
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const imageIssues = await page.evaluate(() => {
    const results: {
      missingLazyLoad: { src: string; html: string }[];
      missingDimensions: { src: string; html: string }[];
      unoptimizedFormat: { src: string; html: string }[];
      oversized: { src: string; html: string; naturalWidth: number; displayWidth: number }[];
    } = {
      missingLazyLoad: [],
      missingDimensions: [],
      unoptimizedFormat: [],
      oversized: [],
    };

    const imgs = Array.from(document.querySelectorAll("img"));
    const viewportHeight = window.innerHeight;

    for (const img of imgs) {
      const rect = img.getBoundingClientRect();
      const isAboveFold = rect.top < viewportHeight;
      const src = img.src || img.getAttribute("data-src") || "";

      // Skip tiny images (likely icons/spacers)
      if (img.naturalWidth < 10 && img.naturalHeight < 10) continue;

      // Missing lazy loading for below-fold images
      if (
        !isAboveFold &&
        img.loading !== "lazy" &&
        !img.getAttribute("loading") &&
        src.length > 0
      ) {
        results.missingLazyLoad.push({
          src: src.substring(0, 200),
          html: img.outerHTML.substring(0, 200),
        });
      }

      // Missing explicit dimensions
      if (
        (!img.getAttribute("width") || !img.getAttribute("height")) &&
        !img.style.width &&
        !img.style.height &&
        src.length > 0
      ) {
        results.missingDimensions.push({
          src: src.substring(0, 200),
          html: img.outerHTML.substring(0, 200),
        });
      }

      // Unoptimized image format (JPEG/PNG that could be WebP/AVIF)
      if (
        /\.(jpg|jpeg|png|bmp)(\?|$)/i.test(src) &&
        img.naturalWidth > 100
      ) {
        results.unoptimizedFormat.push({
          src: src.substring(0, 200),
          html: img.outerHTML.substring(0, 200),
        });
      }

      // Oversized images (natural size >> display size)
      if (
        img.naturalWidth > 0 &&
        rect.width > 0 &&
        img.naturalWidth > rect.width * 2
      ) {
        results.oversized.push({
          src: src.substring(0, 200),
          html: img.outerHTML.substring(0, 200),
          naturalWidth: img.naturalWidth,
          displayWidth: Math.round(rect.width),
        });
      }
    }

    return {
      missingLazyLoad: results.missingLazyLoad.slice(0, 10),
      missingDimensions: results.missingDimensions.slice(0, 10),
      unoptimizedFormat: results.unoptimizedFormat.slice(0, 10),
      oversized: results.oversized.slice(0, 10),
    };
  });

  if (imageIssues.missingLazyLoad.length > 0) {
    violations.push({
      id: `perf-img-lazy-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "medium",
      rule: "img-missing-lazy-loading",
      message: `${imageIssues.missingLazyLoad.length} below-fold image(s) missing lazy loading`,
      element: imageIssues.missingLazyLoad
        .map((i) => i.html)
        .join("\n")
        .substring(0, 500),
      url,
      help: 'Add loading="lazy" to images below the fold to defer loading until they are near the viewport.',
      helpUrl: "https://web.dev/browser-level-image-lazy-loading/",
    });
  }

  if (imageIssues.missingDimensions.length > 0) {
    violations.push({
      id: `perf-img-dimensions-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "medium",
      rule: "img-missing-dimensions",
      message: `${imageIssues.missingDimensions.length} image(s) missing explicit width/height attributes`,
      element: imageIssues.missingDimensions
        .map((i) => i.html)
        .join("\n")
        .substring(0, 500),
      url,
      help: "Add width and height attributes to <img> elements to prevent layout shift (CLS).",
      helpUrl: "https://web.dev/optimize-cls/#images-without-dimensions",
    });
  }

  if (imageIssues.unoptimizedFormat.length > 0) {
    violations.push({
      id: `perf-img-format-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "low",
      rule: "img-unoptimized-format",
      message: `${imageIssues.unoptimizedFormat.length} image(s) using legacy formats (JPEG/PNG) that could be WebP or AVIF`,
      url,
      help: "Convert images to modern formats (WebP or AVIF) for better compression. Use <picture> with fallbacks.",
      helpUrl: "https://web.dev/uses-webp-images/",
    });
  }

  if (imageIssues.oversized.length > 0) {
    violations.push({
      id: `perf-img-oversized-${Math.random().toString(36).slice(2, 8)}`,
      category: "performance",
      severity: "medium",
      rule: "img-oversized",
      message: `${imageIssues.oversized.length} image(s) are significantly larger than their display size`,
      element: imageIssues.oversized
        .map(
          (i) =>
            `${i.html} (natural: ${i.naturalWidth}px, displayed: ${i.displayWidth}px)`
        )
        .join("\n")
        .substring(0, 500),
      url,
      help: "Serve appropriately sized images using srcset and sizes attributes.",
      helpUrl: "https://web.dev/serve-responsive-images/",
    });
  }

  return violations;
}

/**
 * Check the total number of HTTP requests made by the page.
 */
async function checkRequestCount(
  page: Page,
  url: string
): Promise<Violation[]> {
  const violations: Violation[] = [];

  try {
    const resourceCount = await page.evaluate(() => {
      const entries = performance.getEntriesByType("resource");
      const byType: Record<string, number> = {};
      for (const entry of entries) {
        const type = (entry as PerformanceResourceTiming).initiatorType || "other";
        byType[type] = (byType[type] || 0) + 1;
      }
      return { total: entries.length, byType };
    });

    if (resourceCount.total > THRESHOLDS.REQUEST_COUNT_CRITICAL) {
      violations.push({
        id: `perf-request-count-${Math.random().toString(36).slice(2, 8)}`,
        category: "performance",
        severity: "high",
        rule: "excessive-requests",
        message: `Page makes ${resourceCount.total} HTTP requests (recommended < 80)`,
        url,
        help: "Reduce HTTP requests by bundling assets, using sprites, inlining small resources, and removing unused dependencies.",
      });
    } else if (resourceCount.total > THRESHOLDS.REQUEST_COUNT_WARNING) {
      violations.push({
        id: `perf-request-count-${Math.random().toString(36).slice(2, 8)}`,
        category: "performance",
        severity: "medium",
        rule: "many-requests",
        message: `Page makes ${resourceCount.total} HTTP requests (recommended < 80)`,
        url,
        help: "Consider reducing the number of HTTP requests by consolidating resources.",
      });
    }
  } catch (error) {
    console.error("[performance] Request count check failed:", error);
  }

  return violations;
}

/**
 * Calculate a performance score (0-100) from collected metrics.
 *
 * Scoring is based on Core Web Vitals thresholds with weighted
 * contributions from each metric.
 *
 * @param metrics - The collected performance metrics
 * @returns Score from 0 to 100
 */
export function calculatePerformanceScore(metrics: PerformanceMetrics): number {
  let score = 100;

  // LCP (weight: 25%)
  if (metrics.largestContentfulPaint > THRESHOLDS.LCP_POOR) {
    score -= 25;
  } else if (metrics.largestContentfulPaint > THRESHOLDS.LCP_GOOD) {
    const ratio =
      (metrics.largestContentfulPaint - THRESHOLDS.LCP_GOOD) /
      (THRESHOLDS.LCP_POOR - THRESHOLDS.LCP_GOOD);
    score -= Math.round(25 * ratio);
  }

  // FCP (weight: 15%)
  if (metrics.firstContentfulPaint > THRESHOLDS.FCP_POOR) {
    score -= 15;
  } else if (metrics.firstContentfulPaint > THRESHOLDS.FCP_GOOD) {
    const ratio =
      (metrics.firstContentfulPaint - THRESHOLDS.FCP_GOOD) /
      (THRESHOLDS.FCP_POOR - THRESHOLDS.FCP_GOOD);
    score -= Math.round(15 * ratio);
  }

  // CLS (weight: 25%)
  if (metrics.cumulativeLayoutShift > THRESHOLDS.CLS_POOR) {
    score -= 25;
  } else if (metrics.cumulativeLayoutShift > THRESHOLDS.CLS_GOOD) {
    const ratio =
      (metrics.cumulativeLayoutShift - THRESHOLDS.CLS_GOOD) /
      (THRESHOLDS.CLS_POOR - THRESHOLDS.CLS_GOOD);
    score -= Math.round(25 * ratio);
  }

  // TBT (weight: 25%)
  if (metrics.totalBlockingTime > THRESHOLDS.TBT_POOR) {
    score -= 25;
  } else if (metrics.totalBlockingTime > THRESHOLDS.TBT_GOOD) {
    const ratio =
      (metrics.totalBlockingTime - THRESHOLDS.TBT_GOOD) /
      (THRESHOLDS.TBT_POOR - THRESHOLDS.TBT_GOOD);
    score -= Math.round(25 * ratio);
  }

  // DOM size penalty (weight: 5%)
  if (metrics.domNodes > THRESHOLDS.DOM_NODES_CRITICAL) {
    score -= 5;
  } else if (metrics.domNodes > THRESHOLDS.DOM_NODES_WARNING) {
    score -= 3;
  }

  // Transfer size penalty (weight: 5%)
  if (metrics.transferSize > THRESHOLDS.PAGE_WEIGHT_CRITICAL) {
    score -= 5;
  } else if (metrics.transferSize > THRESHOLDS.PAGE_WEIGHT_WARNING) {
    score -= 3;
  }

  return Math.max(0, Math.min(100, score));
}
