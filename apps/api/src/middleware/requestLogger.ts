import type { Request, Response, NextFunction } from "express";
import { logger, generateRequestId } from "../utils/logger";

// Extend Express Request to carry requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware that:
 * 1. Generates a unique request ID and attaches it to req.requestId
 * 2. Logs method, path, status code, and duration for every request
 * 3. Skips the /health endpoint to avoid noise
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip health checks
  if (req.path === "/health") {
    next();
    return;
  }

  const requestId = generateRequestId();
  req.requestId = requestId;

  // Set header so callers can correlate
  res.setHeader("X-Request-Id", requestId);

  const start = Date.now();

  // Hook into response finish to log after status code is set
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("request", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}
