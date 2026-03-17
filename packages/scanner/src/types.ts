import type { ScanOptions, Violation } from "@preship/shared";

export interface PageScanResult {
  url: string;
  violations: Violation[];
  metrics?: PerformanceMetrics;
}

export interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  timeToInteractive: number;
  transferSize: number;
  domNodes: number;
}

export interface CrawlResult {
  urls: string[];
  sitemapFound: boolean;
}

export interface ScannerConfig extends ScanOptions {
  /** Run browser in headless mode (default: true) */
  headless?: boolean;
  /** Custom user agent string for the browser */
  userAgent?: string;
  /** Project ID for associating results with a project */
  projectId?: string;
  /** CSS selector to wait for before running checks */
  waitForSelector?: string;
}

export interface SecurityCheckResult {
  violations: Violation[];
  headersPresent: string[];
  headersMissing: string[];
}
