import type { Page } from "puppeteer";
import * as cheerio from "cheerio";
import type { CrawlResult } from "./types";

/** File extensions to skip when crawling (non-HTML resources) */
const SKIP_EXTENSIONS =
  /\.(pdf|png|jpg|jpeg|gif|svg|ico|webp|avif|bmp|tiff|zip|tar|gz|rar|7z|mp3|mp4|avi|mov|wmv|flv|webm|ogg|wav|woff|woff2|ttf|eot|otf|css|js|json|xml|txt|csv|xls|xlsx|doc|docx|ppt|pptx)(\?.*)?$/i;

/** URL patterns to skip (login, logout, admin, etc.) */
const SKIP_PATTERNS = [
  /\/logout\b/i,
  /\/signout\b/i,
  /\/admin\//i,
  /\/wp-admin\//i,
  /\?action=logout/i,
  /\/delete\b/i,
  /javascript:/i,
  /mailto:/i,
  /tel:/i,
  /^data:/i,
  /^blob:/i,
];

/**
 * Discover pages on a site by crawling links and checking for a sitemap.
 *
 * Uses a breadth-first search (BFS) strategy starting from the base URL.
 * Respects same-origin policy, deduplicates URLs by normalizing them,
 * and skips non-HTML resources.
 *
 * @param page - A Puppeteer Page instance to use for navigation
 * @param baseUrl - The starting URL to crawl from
 * @param maxPages - Maximum number of pages to discover (default: 10, capped at 50)
 * @returns CrawlResult with discovered URLs and sitemap status
 */
export async function crawlSite(
  page: Page,
  baseUrl: string,
  maxPages: number = 10
): Promise<CrawlResult> {
  // Cap maxPages at 50
  maxPages = Math.min(Math.max(1, maxPages), 50);

  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(baseUrl)];
  let sitemapFound = false;
  const baseOrigin = new URL(baseUrl).origin;

  // Try sitemap.xml first to seed the queue with known pages
  try {
    const sitemapUrls = await fetchSitemap(page, baseOrigin);
    if (sitemapUrls.length > 0) {
      sitemapFound = true;
      for (const sitemapUrl of sitemapUrls) {
        const normalized = normalizeUrl(sitemapUrl);
        if (!queue.includes(normalized)) {
          queue.push(normalized);
        }
      }
    }
  } catch {
    // Sitemap not available, proceed with link crawling
  }

  // BFS crawl: process pages from the queue
  while (queue.length > 0 && visited.size < maxPages) {
    const currentUrl = queue.shift()!;

    // Skip if already visited
    if (visited.has(currentUrl)) continue;

    // Skip non-HTML resources and problematic URLs
    if (shouldSkipUrl(currentUrl, baseOrigin)) continue;

    visited.add(currentUrl);

    try {
      const response = await page.goto(currentUrl, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Only crawl links from HTML pages
      if (response) {
        const contentType = response.headers()["content-type"] || "";
        if (!contentType.includes("text/html")) {
          continue;
        }
      }

      // Extract links from the page
      const links = await page.evaluate((origin: string) => {
        return Array.from(document.querySelectorAll("a[href]"))
          .map((a) => {
            try {
              return new URL(
                (a as HTMLAnchorElement).href,
                window.location.href
              ).href;
            } catch {
              return null;
            }
          })
          .filter(
            (href): href is string =>
              href !== null && href.startsWith(origin)
          );
      }, baseOrigin);

      // Add discovered links to the queue
      for (const link of links) {
        const normalized = normalizeUrl(link);
        if (
          !visited.has(normalized) &&
          !queue.includes(normalized) &&
          !shouldSkipUrl(normalized, baseOrigin)
        ) {
          queue.push(normalized);
        }
      }
    } catch {
      // Skip pages that fail to load (timeout, network error, etc.)
    }
  }

  return {
    urls: Array.from(visited),
    sitemapFound,
  };
}

/**
 * Fetch and parse a sitemap.xml file to extract page URLs.
 *
 * @param page - Puppeteer page for navigation
 * @param baseOrigin - The origin to fetch sitemap from
 * @returns Array of URLs found in the sitemap
 */
async function fetchSitemap(
  page: Page,
  baseOrigin: string
): Promise<string[]> {
  const sitemapUrl = `${baseOrigin}/sitemap.xml`;
  const response = await page.goto(sitemapUrl, {
    waitUntil: "networkidle2",
    timeout: 10000,
  });

  if (!response || response.status() !== 200) {
    return [];
  }

  const content = await page.content();
  const $ = cheerio.load(content, { xmlMode: true });
  const urls: string[] = [];

  // Handle regular sitemap
  $("loc").each((_, el) => {
    const loc = $(el).text().trim();
    if (loc && loc.startsWith(baseOrigin)) {
      urls.push(loc);
    }
  });

  // Handle sitemap index (sitemaps that point to other sitemaps)
  // We only take direct page URLs, not nested sitemap URLs
  // to keep things simple and fast
  // Sub-sitemaps are intentionally skipped to avoid recursive
  // fetching. We only use the top-level URLs.

  return urls;
}

/**
 * Determine if a URL should be skipped during crawling.
 *
 * @param url - The URL to check
 * @param baseOrigin - The base origin to enforce same-origin policy
 * @returns true if the URL should be skipped
 */
function shouldSkipUrl(url: string, baseOrigin: string): boolean {
  // Must be same origin
  try {
    const parsed = new URL(url);
    if (parsed.origin !== baseOrigin) return true;
  } catch {
    return true;
  }

  // Skip file extensions that aren't HTML
  if (SKIP_EXTENSIONS.test(url)) return true;

  // Skip problematic URL patterns
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(url)) return true;
  }

  return false;
}

/**
 * Normalize a URL for deduplication.
 *
 * Removes:
 * - Trailing slashes
 * - Hash fragments
 * - Common tracking parameters (utm_*)
 * - Default ports
 *
 * @param url - The URL to normalize
 * @returns Normalized URL string
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);

    // Remove hash fragment
    u.hash = "";

    // Remove common tracking parameters
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
      "source",
    ];
    for (const param of trackingParams) {
      u.searchParams.delete(param);
    }

    // Sort remaining search params for consistent deduplication
    u.searchParams.sort();

    // Normalize path: remove trailing slash (except for root)
    let path = u.pathname.replace(/\/+$/, "") || "/";

    // Normalize index files
    path = path.replace(/\/index\.(html?|php|asp|aspx|jsp)$/, "/");

    // Reconstruct the URL
    const search = u.searchParams.toString();
    return `${u.origin}${path}${search ? "?" + search : ""}`;
  } catch {
    return url;
  }
}
