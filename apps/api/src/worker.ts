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
import type { ScanJobData } from "./services/queue";

const SCAN_QUEUE_NAME = "scans";

async function processScanJob(
  job: Job<ScanJobData>
): Promise<{ scanId: string; overallScore: number }> {
  const { scanId, userId, url, options } = job.data;

  console.log(`[worker] Processing scan ${scanId} for ${url}`);

  await scanQueries.updateStatus(scanId, "running");
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
    console.log(`[worker] Scan ${scanId} completed with score ${overallScore}`);

    return { scanId, overallScore };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown scan error";
    console.error(`[worker] Scan ${scanId} failed:`, message);

    await scanQueries.updateStatus(scanId, "failed", { error: message });
    throw error;
  }
}

async function start() {
  console.log("[worker] Starting BullMQ worker...");

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
    console.log(`[worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[worker] Job ${job?.id} failed:`, error.message);
  });

  worker.on("error", (err) => {
    console.error("[worker] Worker error:", err.message);
  });

  console.log("[worker] Worker listening for jobs on queue:", SCAN_QUEUE_NAME);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[worker] Shutting down...");
    await worker.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
