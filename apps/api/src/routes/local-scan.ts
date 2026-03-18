/**
 * Local-dev scan routes.
 *
 * Mirrors the production scan routes (routes/scan.ts) but uses:
 * - SQLite models instead of PostgreSQL
 * - localAuthMiddleware instead of JWT/pg auth
 * - localQueueService instead of BullMQ/Redis
 */

import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { ScanRequestSchema, type ScanResult } from "@preship/shared";
import { scanQueries } from "../models/sqlite";
import {
  localAuthMiddleware,
  type AuthenticatedRequest,
} from "../middleware/local-auth";
import {
  localQueueService,
} from "../services/local-queue";
import { generatePdfReport } from "../services/pdf";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "../utils/errors";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────

const listScansSchema = z.object({
  projectId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["date", "score"]).default("date"),
});

// ─── POST /scans ─────────────────────────────────────────────────────

router.post(
  "/",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = ScanRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          "Invalid request",
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        );
      }

      const { url, projectId, options } = parsed.data;

      const scan = await scanQueries.create({
        user_id: req.userId!,
        url,
        project_id: projectId,
        checks: options?.categories ?? [],
        pages: [],
      });

      // Queue (will process immediately in background)
      await localQueueService.addScanJob({
        scanId: scan.id,
        userId: req.userId!,
        url,
        projectId,
        options,
      });

      res.status(202).json({
        success: true,
        data: {
          scanId: scan.id,
          status: "queued",
          url: scan.url,
          projectId: projectId || null,
          createdAt: scan.created_at,
          statusUrl: `/api/scans/${scan.id}`,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /scans ──────────────────────────────────────────────────────

router.get(
  "/",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = listScansSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError(
          "Invalid query parameters",
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        );
      }

      const { page, limit, sort, projectId } = parsed.data;
      const offset = (page - 1) * limit;

      const { scans, total } = await scanQueries.findByUserId(req.userId!, {
        projectId,
        limit,
        offset,
        sort,
      });

      res.json({
        success: true,
        data: {
          scans: scans.map((s) => ({
            scanId: s.id,
            url: s.url,
            status: s.status,
            overallScore: s.score ?? 0,
            createdAt: s.created_at,
            completedAt: s.completed_at,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /scans/:id ─────────────────────────────────────────────────

router.get(
  "/:id",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const scan = await scanQueries.findById(req.params.id);
      if (!scan) throw new NotFoundError("Scan");
      if (scan.user_id !== req.userId)
        throw new ForbiddenError("You do not have access to this scan");

      if (scan.status === "queued" || scan.status === "processing") {
        const jobStatus = await localQueueService.getJobStatus(scan.id);
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

      res.json({
        success: true,
        data: {
          scanId: scan.id,
          status: scan.status,
          url: scan.url,
          overallScore: scan.score ?? 0,
          results: scan.results,
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

// ─── GET /scans/:id/report ──────────────────────────────────────────

router.get(
  "/:id/report",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const scan = await scanQueries.findById(req.params.id);
      if (!scan) throw new NotFoundError("Scan");
      if (scan.user_id !== req.userId)
        throw new ForbiddenError("You do not have access to this scan");
      if (scan.status !== "completed")
        throw new ValidationError("Scan is not yet completed.");

      const scanResult: ScanResult = {
        id: scan.id,
        projectId: scan.project_id ?? "",
        url: scan.url,
        status: "completed",
        overallScore: scan.score ?? 0,
        categories: (scan.results as any)?.categories ?? [],
        violations: (scan.results as any)?.violations ?? [],
        suggestions: (scan.results as any)?.suggestions ?? [],
        pagesScanned: (scan.results as any)?.pagesScanned ?? 1,
        duration: (scan.results as any)?.duration ?? 0,
        createdAt: scan.created_at.toISOString(),
        completedAt: scan.completed_at?.toISOString(),
      };

      const pdfBuffer = await generatePdfReport(scanResult);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="preship-report-${scan.id.slice(0, 8)}.pdf"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
