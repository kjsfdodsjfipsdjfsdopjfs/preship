import { Router } from "express";
import { Redis } from "ioredis";
import { pool } from "../models/index";
import { config } from "../config";
import { logger } from "../utils/logger";

const router = Router();

/**
 * GET /health
 *
 * Returns detailed health status including database and Redis connectivity.
 */
router.get("/health", async (_req, res) => {
  let database: "ok" | "error" = "error";
  let redis: "ok" | "error" = "error";

  // Check database connectivity
  try {
    await pool.query("SELECT 1");
    database = "ok";
  } catch (err) {
    logger.error("Health check: database unreachable", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Check Redis connectivity
  try {
    const client = new Redis(config.redisUrl, {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 0,
    });
    await client.connect();
    await client.ping();
    redis = "ok";
    await client.quit();
  } catch (err) {
    logger.error("Health check: redis unreachable", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const overall = database === "ok" && redis === "ok" ? "ok" : "degraded";
  const statusCode = overall === "ok" ? 200 : 503;

  res.status(statusCode).json({
    status: overall,
    database,
    redis,
    uptime: process.uptime(),
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});

export default router;
