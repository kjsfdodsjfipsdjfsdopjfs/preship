import { Queue, Worker, Job } from "bullmq";
import { scan } from "@preship/scanner";
import { config } from "../config";
import { scanQueries, usageQueries } from "../models/index";
import type { ScanRequest } from "@preship/shared";

const SCAN_QUEUE_NAME = "scans";

// ─── Job Data ────────────────────────────────────────────────────────

export interface ScanJobData {
  scanId: string;
  userId: string;
  url: string;
  projectId?: string;
  options?: ScanRequest["options"];
}

// ─── Queue Service ───────────────────────────────────────────────────

export class QueueService {
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  /**
   * Initialize the queue and worker.
   * Call this on server startup.
   */
  async initialize(): Promise<void> {
    try {
      const connection = { url: config.redisUrl };

      this.queue = new Queue(SCAN_QUEUE_NAME, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
          removeOnComplete: { age: 86400, count: 1000 },
          removeOnFail: { age: 604800, count: 5000 },
        },
      });

      this.worker = new Worker<ScanJobData>(
        SCAN_QUEUE_NAME,
        async (job: Job<ScanJobData>) => {
          return this.processScanJob(job);
        },
        {
          connection,
          concurrency: 5,
          limiter: {
            max: 10,
            duration: 60_000,
          },
        }
      );

      this.worker.on("completed", (job) => {
        console.log(`[queue] Scan job ${job.id} completed`);
      });

      this.worker.on("failed", (job, error) => {
        console.error(
          `[queue] Scan job ${job?.id} failed:`,
          error.message
        );
      });

      this.worker.on("error", (err) => {
        console.error("[queue] Worker error:", err.message);
      });

      console.log("[queue] Queue service initialized");
    } catch (error) {
      console.warn(
        "[queue] Queue service initialization failed (Redis may not be available):",
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Process a single scan job using the real @preship/scanner.
   */
  private async processScanJob(
    job: Job<ScanJobData>
  ): Promise<{ scanId: string; overallScore: number }> {
    const { scanId, userId, url, options } = job.data;

    console.log(`[queue] Processing scan ${scanId} for ${url}`);

    // Update status to running (matches shared ScanStatus type)
    await scanQueries.updateStatus(scanId, "running");
    await job.updateProgress(10);

    try {
      await job.updateProgress(20);

      // Run the real scanner from @preship/scanner
      const result = await scan(url, {
        maxPages: options?.maxPages ?? config.maxPages,
        categories: options?.categories ?? [
          "accessibility",
          "security",
          "performance",
        ],
        includeFixSuggestions: options?.includeFixSuggestions ?? false,
        viewport: options?.viewport,
        waitForTimeout: options?.waitForTimeout,
      });

      await job.updateProgress(90);

      const overallScore = result.overallScore ?? 0;

      // Store results
      await scanQueries.updateStatus(scanId, "completed", {
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

      // Increment usage counter
      await usageQueries.incrementUsage(userId);

      await job.updateProgress(100);
      console.log(`[queue] Scan ${scanId} completed with score ${overallScore}`);

      return { scanId, overallScore };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown scan error";
      console.error(`[queue] Scan ${scanId} failed:`, message);

      await scanQueries.updateStatus(scanId, "failed", { error: message });
      throw error;
    }
  }

  /**
   * Add a scan job to the queue.
   */
  async addScanJob(data: ScanJobData): Promise<void> {
    if (!this.queue) {
      throw new Error("Queue not initialized. Is Redis available?");
    }

    await this.queue.add("scan", data, {
      jobId: data.scanId,
    });
  }

  /**
   * Get job status by scan ID.
   */
  async getJobStatus(
    scanId: string
  ): Promise<{ state: string; progress: number } | null> {
    if (!this.queue) return null;

    const job = await this.queue.getJob(scanId);
    if (!job) return null;

    const state = await job.getState();
    const progress =
      typeof job.progress === "number" ? job.progress : 0;

    return { state, progress };
  }

  /**
   * Gracefully shut down the queue and worker.
   */
  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }
}

export const queueService = new QueueService();
