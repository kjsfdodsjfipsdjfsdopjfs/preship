/**
 * Local-dev project routes.
 *
 * Mirrors the production project routes (routes/projects.ts) but uses:
 * - SQLite models instead of PostgreSQL
 * - localAuthMiddleware instead of JWT/pg auth
 */

import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { CreateProjectSchema } from "@preship/shared";
import { projectQueries, scanQueries } from "../models/sqlite";
import {
  localAuthMiddleware,
  type AuthenticatedRequest,
} from "../middleware/local-auth";
import {
  ValidationError,
  NotFoundError,
} from "../utils/errors";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────

const createProjectSchema = CreateProjectSchema.extend({
  checks: z.array(z.string()).optional(),
  schedule: z
    .enum(["daily", "weekly", "monthly", ""])
    .optional()
    .transform((v) => v || undefined),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().optional(),
  checks: z.array(z.string()).optional(),
  schedule: z
    .enum(["daily", "weekly", "monthly", ""])
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v)),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── POST /projects ──────────────────────────────────────────────────

router.post(
  "/",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(
          "Validation failed",
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        );

      const project = await projectQueries.create({
        user_id: req.userId!,
        name: parsed.data.name,
        url: parsed.data.url,
        checks: parsed.data.checks,
        schedule: parsed.data.schedule,
      });

      res.status(201).json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /projects ───────────────────────────────────────────────────

router.get(
  "/",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = paginationSchema.safeParse(req.query);
      if (!parsed.success)
        throw new ValidationError(
          "Invalid query parameters",
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        );

      const { page, limit } = parsed.data;
      const offset = (page - 1) * limit;
      const { projects, total } = await projectQueries.findByUserId(
        req.userId!,
        { limit, offset }
      );

      res.json({
        success: true,
        data: {
          projects,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /projects/:id ──────────────────────────────────────────────

router.get(
  "/:id",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const project = await projectQueries.findById(
        req.params.id,
        req.userId!
      );
      if (!project) throw new NotFoundError("Project");

      const { scans } = await scanQueries.findByUserId(req.userId!, {
        projectId: project.id,
        limit: 1,
        offset: 0,
        sort: "date",
      });

      res.json({
        success: true,
        data: {
          ...project,
          latestScan: scans[0]
            ? {
                scanId: scans[0].id,
                status: scans[0].status,
                overallScore: scans[0].score ?? 0,
                createdAt: scans[0].created_at,
                completedAt: scans[0].completed_at,
              }
            : null,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /projects/:id/history ───────────────────────────────────────

router.get(
  "/:id/history",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const project = await projectQueries.findById(
        req.params.id,
        req.userId!
      );
      if (!project) throw new NotFoundError("Project");

      const history = await scanQueries.getProjectHistory(
        project.id,
        req.userId!
      );

      res.json({
        success: true,
        data: {
          projectId: project.id,
          projectName: project.name,
          history: history.map((h) => ({
            scanId: h.id,
            overallScore: h.score ?? 0,
            status: h.status,
            createdAt: h.created_at,
            completedAt: h.completed_at,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /projects/:id ─────────────────────────────────────────────

router.patch(
  "/:id",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = updateProjectSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(
          "Validation failed",
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        );

      const updated = await projectQueries.update(
        req.params.id,
        req.userId!,
        parsed.data as any
      );
      if (!updated) throw new NotFoundError("Project");
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /projects/:id ────────────────────────────────────────────

router.delete(
  "/:id",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const deleted = await projectQueries.delete(req.params.id, req.userId!);
      if (!deleted) throw new NotFoundError("Project");
      res.json({ success: true, data: { message: "Project deleted" } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
