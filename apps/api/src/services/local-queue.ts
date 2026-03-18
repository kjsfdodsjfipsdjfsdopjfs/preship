/**
 * In-memory queue replacement for BullMQ.
 * Processes scan jobs synchronously in-process using @preship/scanner.
 * No Redis dependency needed.
 */

import { scan } from "@preship/scanner";
import type { ScanJobData } from "./queue";

// These will be injected by local.ts to avoid circular imports with the pg-based models
let _scanQueries: any;
let _usageQueries: any;

export function injectDependencies(scanQueries: any, usageQueries: any) {
  _scanQueries = scanQueries;
  _usageQueries = usageQueries;
}

/**
 * Local queue service that processes jobs immediately in-process.
 * Matches the interface used by the scan routes.
 */
export class LocalQueueService {
  private jobProgress: Map<string, number> = new Map();

  async initialize(): Promise<void> {
    console.log("[local-queue] In-memory queue service initialized (no Redis)");
  }

  /**
   * Add and immediately process a scan job.
   * Runs the actual scanner from @preship/scanner.
   */
  async addScanJob(data: ScanJobData): Promise<void> {
    const { scanId, userId, url, options } = data;

    // Start processing in the background (don't await - return 202 immediately)
    this.processScanJob(scanId, userId, url, options).catch((err) => {
      console.error(`[local-queue] Background scan ${scanId} failed:`, err);
    });
  }

  private async processScanJob(
    scanId: string,
    userId: string,
    url: string,
    options?: ScanJobData["options"]
  ): Promise<void> {
    console.log(`[local-queue] Processing scan ${scanId} for ${url}`);

    this.jobProgress.set(scanId, 10);

    // Update status to running
    await _scanQueries.updateStatus(scanId, "processing");

    try {
      this.jobProgress.set(scanId, 20);

      // Run the actual scanner
      const result = await scan(url, {
        maxPages: options?.maxPages ?? 1,
        categories: options?.categories ?? [
          "accessibility",
          "security",
          "performance",
        ],
        includeFixSuggestions: options?.includeFixSuggestions ?? false,
        viewport: options?.viewport,
        waitForTimeout: options?.waitForTimeout,
      });

      this.jobProgress.set(scanId, 90);

      const overallScore = result.overallScore ?? 0;

      // Store results
      await _scanQueries.updateStatus(scanId, "completed", {
        score: overallScore,
        results: {
          url: result.url,
          scannedAt: result.createdAt,
          pagesScanned: result.pagesScanned,
          duration: result.duration,
          overallScore,
          categories: result.categories,
          violations: result.violations,
          suggestions: result.suggestions,
        },
      });

      // Increment usage
      await _usageQueries.incrementUsage(userId);

      this.jobProgress.set(scanId, 100);
      console.log(
        `[local-queue] Scan ${scanId} completed with score ${overallScore}`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown scan error";
      console.error(`[local-queue] Scan ${scanId} failed:`, message);

      await _scanQueries.updateStatus(scanId, "failed", { error: message });
      this.jobProgress.delete(scanId);
      throw error;
    }
  }

  /**
   * Get job status by scan ID.
   */
  async getJobStatus(
    scanId: string
  ): Promise<{ state: string; progress: number } | null> {
    const progress = this.jobProgress.get(scanId);
    if (progress === undefined) return null;
    return {
      state: progress >= 100 ? "completed" : "active",
      progress,
    };
  }

  async shutdown(): Promise<void> {
    this.jobProgress.clear();
    console.log("[local-queue] Queue service shut down");
  }
}

export const localQueueService = new LocalQueueService();
