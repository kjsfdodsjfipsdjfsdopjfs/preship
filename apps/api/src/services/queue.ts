import { Queue, Worker, Job } from "bullmq";
import { scan } from "@preship/scanner";
import { config } from "../config";
import { scanQueries, usageQueries } from "../models/index";
import { logger } from "../utils/logger";
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
        logger.info("Scan job completed", { jobId: job.id, component: "queue" });
      });

      this.worker.on("failed", (job, error) => {
        logger.error("Scan job failed", {
          jobId: job?.id,
          error: error.message,
          component: "queue",
        });
      });

      this.worker.on("error", (err) => {
        logger.error("Worker error", { error: err.message, component: "queue" });
      });

      logger.info("Queue service initialized", { component: "queue" });
    } catch (error) {
      logger.warn("Queue service initialization failed (Redis may not be available)", {
        error: error instanceof Error ? error.message : String(error),
        component: "queue",
      });
    }
  }

  /**
   * Process a single scan job using the real @preship/scanner.
   */
  private async processScanJob(
    job: Job<ScanJobData>
  ): Promise<{ scanId: string; overallScore: number }> {
    const { scanId, userId, url, options } = job.data;

    logger.info("Processing scan", { scanId, url, component: "queue" });

    // Update status to processing (matches DB CHECK constraint)
    await scanQueries.updateStatus(scanId, "processing");
    await job.updateProgress(10);

    try {
      await job.updateProgress(20);

      // Run the real scanner from @preship/scanner
      // Limit pages based on plan - free plan gets 5 max
      const maxPagesForPlan = 5; // TODO: read from user plan
      const result = await scan(url, {
        maxPages: Math.min(options?.maxPages ?? maxPagesForPlan, maxPagesForPlan),
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
      logger.info("Scan completed", { scanId, overallScore, component: "queue" });

      return { scanId, overallScore };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown scan error";
      logger.error("Scan failed", { scanId, error: message, component: "queue" });

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
