/**
 * BullMQ Worker entrypoint.
 *
 * This file is the Docker entrypoint for the "worker" container.
 * It connects to Redis, starts the BullMQ worker that processes scan jobs,
 * and does NOT start an HTTP server.
 */

import { Worker, Job } from "bullmq";
import { scan } from "@preship/scanner";
import { config } from "./config";
import { scanQueries, usageQueries } from "./models/index";
import { logger } from "./utils/logger";
import type { ScanJobData } from "./services/queue";

const SCAN_QUEUE_NAME = "scans";

async function processScanJob(
  job: Job<ScanJobData>
): Promise<{ scanId: string; overallScore: number }> {
  const { scanId, userId, url, options } = job.data;

  logger.info("Processing scan", { scanId, url, component: "worker" });

  await scanQueries.updateStatus(scanId, "processing");
  await job.updateProgress(10);

  try {
    await job.updateProgress(20);

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

    await usageQueries.incrementUsage(userId);

    await job.updateProgress(100);
    logger.info("Scan completed", { scanId, overallScore, component: "worker" });

    return { scanId, overallScore };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown scan error";
    logger.error("Scan failed", { scanId, error: message, component: "worker" });

    await scanQueries.updateStatus(scanId, "failed", { error: message });
    throw error;
  }
}

async function start() {
  logger.info("Starting BullMQ worker", { component: "worker" });

  const connection = { url: config.redisUrl };

  const worker = new Worker<ScanJobData>(
    SCAN_QUEUE_NAME,
    async (job: Job<ScanJobData>) => {
      return processScanJob(job);
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

  worker.on("completed", (job) => {
    logger.info("Job completed", { jobId: job.id, component: "worker" });
  });

  worker.on("failed", (job, error) => {
    logger.error("Job failed", {
      jobId: job?.id,
      error: error.message,
      component: "worker",
    });
  });

  worker.on("error", (err) => {
    logger.error("Worker error", { error: err.message, component: "worker" });
  });

  logger.info("Worker listening for jobs", {
    queue: SCAN_QUEUE_NAME,
    component: "worker",
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down", { component: "worker" });
    await worker.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((err) => {
  logger.error("Fatal error", {
    error: err instanceof Error ? err.message : String(err),
    component: "worker",
  });
  process.exit(1);
});
