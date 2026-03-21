import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { scanQueries } from "../models/index";
import { queueService } from "../services/queue";
import { ValidationError, NotFoundError } from "../utils/errors";
import { logger } from "../utils/logger";

const router = Router();

// ─── In-memory IP rate limiter (5 per hour per IP) ──────────────────

const PUBLIC_SCAN_LIMIT = 5;
const PUBLIC_SCAN_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const ipHits: Map<string, number[]> = new Map();

// Clean up stale entries every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - PUBLIC_SCAN_WINDOW_MS;
  for (const [ip, timestamps] of ipHits.entries()) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      ipHits.delete(ip);
    } else {
      ipHits.set(ip, valid);
    }
  }
}, 10 * 60 * 1000).unref();

function checkPublicRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const cutoff = now - PUBLIC_SCAN_WINDOW_MS;

  const timestamps = (ipHits.get(ip) || []).filter((t) => t > cutoff);

  if (timestamps.length >= PUBLIC_SCAN_LIMIT) {
    res.status(429).json({
      success: false,
      error:
        "Rate limit reached. Create a free account for unlimited scans.",
      signupUrl: "/signup",
    });
    return;
  }

  timestamps.push(now);
  ipHits.set(ip, timestamps);
  next();
}

// ─── Schemas ────────────────────────────────────────────────────────

const publicScanSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

// ─── POST / — Create a public (anonymous) scan ─────────────────────

router.post(
  "/",
  checkPublicRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Normalize URL: prepend https:// if no protocol provided
      if (req.body?.url && typeof req.body.url === "string") {
        const trimmed = req.body.url.trim();
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
          req.body.url = "https://" + trimmed;
        }
      }

      const parsed = publicScanSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          "Invalid request",
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        );
      }

      const { url } = parsed.data;

      // Create scan with null userId (anonymous)
      const scan = await scanQueries.create({
        user_id: null,
        url,
        checks: ["accessibility", "security", "performance"],
        pages: [],
      });

      // Queue the scan job with lower priority (10) than auth scans (1)
      try {
        await queueService.addScanJob(
          {
            scanId: scan.id,
            url,
          },
          10
        );
      } catch (err: unknown) {
        // Handle Redis/queue connection errors gracefully
        const message =
          err instanceof Error ? err.message : String(err);
        if (
          message.includes("not initialized") ||
          message.includes("ECONNREFUSED") ||
          message.includes("Connection")
        ) {
          logger.error("Queue unavailable for public scan", {
            scanId: scan.id,
            error: message,
          });
          res.status(503).json({
            success: false,
            error:
              "Our scanning service is temporarily unavailable. Please try again in a few minutes.",
          });
          return;
        }
        throw err;
      }

      res.status(202).json({
        success: true,
        data: {
          scanId: scan.id,
          status: "queued",
          url: scan.url,
          createdAt: scan.created_at,
          statusUrl: `/api/scan/public/${scan.id}`,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /:id — Get public scan result ─────────────────────────────

router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scan = await scanQueries.findById(req.params.id);
      if (!scan) {
        throw new NotFoundError("Scan");
      }

      // Only allow access to public (anonymous) scans
      if (scan.user_id !== null) {
        throw new NotFoundError("Scan");
      }

      // If still processing, include progress info
      if (scan.status === "queued" || scan.status === "processing") {
        const jobStatus = await queueService.getJobStatus(scan.id);

        res.json({
          success: true,
          data: {
            scanId: scan.id,
            status: scan.status,
            url: scan.url,
            progress: jobStatus?.progress ?? 0,
            createdAt: scan.created_at,
          },
        });
        return;
      }

      const r = (scan.results as Record<string, unknown>) ?? {};
      res.json({
        success: true,
        data: {
          scanId: scan.id,
          status: scan.status,
          url: scan.url,
          overallScore: scan.score ?? 0,
          shipReadiness: r.shipReadiness ?? null,
          pillars: r.pillars ?? null,
          categories: r.categories ?? [],
          violations: r.violations ?? [],
          suggestions: r.suggestions ?? [],
          pagesScanned: r.pagesScanned ?? 0,
          duration: r.duration ?? 0,
          framework: r.framework ?? null,
          error: scan.error,
          createdAt: scan.created_at,
          completedAt: scan.completed_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
