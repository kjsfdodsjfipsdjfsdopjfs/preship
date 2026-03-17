import { Queue, Worker, Job } from "bullmq";
import { config } from "../config";
import { scanQueries, usageQueries } from "../models/index";
import type { ScanRequest, ScanResult, CheckCategory } from "@preship/shared";

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
   * Process a single scan job.
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
      // Run the scanning engine
      // In production this would import the actual scanner:
      // import { scannerService } from './scanner';
      // const result = await scannerService.executeScan(url, options);
      const results = await this.runScan({
        url,
        categories: options?.categories ?? [
          "accessibility",
          "security",
          "performance",
        ],
        maxPages: options?.maxPages ?? config.maxPages,
        onProgress: (p: number) => job.updateProgress(p),
      });

      await job.updateProgress(90);

      // Calculate overall score (field name: overallScore per shared types)
      const overallScore = this.calculateScore(results);

      // Generate LLM fix suggestions if enabled and violations exist
      if (
        options?.includeFixSuggestions &&
        results.violations &&
        (results.violations as unknown[]).length > 0
      ) {
        try {
          // In production: const suggestions = await llmService.generateFixSuggestions(result.violations.slice(0, 10));
          // results.suggestions = suggestions;
          console.log(
            `[queue] Would generate fix suggestions for ${(results.violations as unknown[]).length} violations`
          );
        } catch (err) {
          console.warn("[queue] Failed to generate fix suggestions:", err);
        }
      }

      // Store results
      await scanQueries.updateStatus(scanId, "completed", {
        score: overallScore,
        results,
      });

      // Increment usage counter
      await usageQueries.incrementUsage(userId);

      await job.updateProgress(100);
      console.log(`[queue] Scan ${scanId} completed with overallScore ${overallScore}`);

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
   * Placeholder scan runner. Replace with actual scanner engine.
   */
  private async runScan(opts: {
    url: string;
    categories: string[];
    maxPages: number;
    onProgress: (percent: number) => Promise<void>;
  }): Promise<Record<string, unknown>> {
    const { url, categories } = opts;

    await opts.onProgress(20);

    const results: Record<string, unknown> = {
      url,
      scannedAt: new Date().toISOString(),
      pagesScanned: 1,
      duration: 0,
      overallScore: 0,
      categories: [],
      violations: [],
      suggestions: [],
    };

    const startTime = Date.now();

    for (let i = 0; i < categories.length; i++) {
      await opts.onProgress(
        20 + Math.floor((i / categories.length) * 60)
      );

      // Placeholder category result
      (results.categories as unknown[]).push({
        category: categories[i],
        score: 0,
        violations: 0,
        passed: 0,
      });
    }

    results.duration = Date.now() - startTime;
    await opts.onProgress(85);

    return results;
  }

  /**
   * Calculate overall score from scan results.
   */
  private calculateScore(results: Record<string, unknown>): number {
    const categories = results.categories as
      | Array<{ score: number }>
      | undefined;
    if (!categories || categories.length === 0) return 0;

    const scores = categories.map((c) => c.score ?? 0);
    return Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );
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
