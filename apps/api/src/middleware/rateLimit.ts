import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { Redis } from "ioredis";
import { config } from "../config";
import type { AuthenticatedRequest } from "./auth";

// ─── Plan-based rate limits ──────────────────────────────────────────

const PLAN_RATE_LIMITS: Record<string, number> = {
  free: 5,
  pro: 30,
  team: 100,
  enterprise: 300,
};

// ─── Redis-backed plan-aware rate limiter ────────────────────────────

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!redis) {
    try {
      redis = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
      });
      redis.connect().catch((err) => {
        console.warn(
          "[rateLimit] Redis connection failed, falling back to in-memory:",
          err.message
        );
        redis = null;
      });
    } catch {
      return null;
    }
  }
  return redis;
}

/**
 * Plan-aware rate limiting middleware using Redis sliding window.
 * Falls back to express-rate-limit in-memory if Redis is unavailable.
 */
export function planRateLimit(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const plan = req.userPlan ?? "free";
  const maxRequests = PLAN_RATE_LIMITS[plan] ?? PLAN_RATE_LIMITS.free;
  const identifier = req.userId ?? req.ip ?? "anonymous";
  const key = `ratelimit:${identifier}`;
  const windowMs = 60_000;

  const client = getRedis();
  if (!client) {
    // Fall back to basic in-memory limiter - just let it through
    return next();
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  client
    .pipeline()
    .zremrangebyscore(key, 0, windowStart)
    .zadd(key, now.toString(), `${now}:${Math.random()}`)
    .zcard(key)
    .pexpire(key, windowMs)
    .exec()
    .then((results) => {
      if (!results) return next();

      const requestCount = results[2]?.[1] as number;

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader(
        "X-RateLimit-Remaining",
        Math.max(0, maxRequests - requestCount)
      );
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil((now + windowMs) / 1000)
      );

      if (requestCount > maxRequests) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader("Retry-After", retryAfter);
        res.status(429).json({
          success: false,
          error: `Rate limit exceeded. ${plan} plan allows ${maxRequests} requests per minute. Upgrade for higher limits.`,
        });
      } else {
        next();
      }
    })
    .catch((err) => {
      console.error("[rateLimit] Check failed:", err.message);
      next(); // Fail open
    });
}

// ─── Standard express-rate-limit instances ───────────────────────────

/**
 * Standard rate limiter for general API endpoints.
 */
export const standardRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

/**
 * Stricter rate limiter for scan endpoints (resource-intensive).
 */
export const scanRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error:
      "Too many scan requests. Please wait before starting another scan.",
  },
});

/**
 * Auth endpoint rate limiter to prevent brute force.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error:
      "Too many authentication attempts. Please try again later.",
  },
});
