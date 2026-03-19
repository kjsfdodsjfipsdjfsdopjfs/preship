/**
 * Local development entry point for PreShip API.
 *
 * Runs without Docker, PostgreSQL, or Redis by using:
 * - SQLite (via better-sqlite3) instead of PostgreSQL
 * - In-memory queue instead of BullMQ/Redis
 * - Simplified auth (API key only, no JWT)
 * - Mocked billing (always returns free plan)
 *
 * Usage:
 *   npx tsx src/local.ts
 */

import express from "express";
import cors from "cors";
import crypto from "crypto";
import { z } from "zod";
import { ScanRequestSchema, PLAN_LIMITS } from "@preship/shared";
import type { ScanResult } from "@preship/shared";

// ── SQLite models (no PostgreSQL) ───────────────────────────────────
import {
  userQueries,
  scanQueries,
  projectQueries,
  apiKeyQueries,
  usageQueries,
  db,
} from "./models/sqlite";
import type { User } from "./models/index";

// ── Local queue (no Redis) ──────────────────────────────────────────
import {
  localQueueService,
  injectDependencies,
} from "./services/local-queue";

// ── Error classes ───────────────────────────────────────────────────
import {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  AuthError,
} from "./utils/errors";

// ── PDF report generator ────────────────────────────────────────────
import { generatePdfReport } from "./services/pdf";

// ── Shared schemas ──────────────────────────────────────────────────
import { CreateProjectSchema } from "@preship/shared";

// ── Config ──────────────────────────────────────────────────────────
const PORT = parseInt(process.env.API_PORT || "3001", 10);
const API_KEY_SALT = process.env.API_KEY_SALT || "dev-salt-change-me";
const LOCAL_API_KEY = "pk_local_dev";

// ── Wire up local queue with SQLite models ──────────────────────────
injectDependencies(scanQueries, usageQueries);

// ── Helpers ─────────────────────────────────────────────────────────

function hashApiKey(key: string): string {
  return crypto.createHmac("sha256", API_KEY_SALT).update(key).digest("hex");
}

// ── Seed default user & API key ─────────────────────────────────────

interface AuthenticatedRequest extends express.Request {
  userId?: string;
  userPlan?: string;
  user?: User;
}

async function seedDatabase(): Promise<{ userId: string; apiKey: string }> {
  const email = "local@preship.dev";

  // Check if user already exists
  let user = await userQueries.findByEmail(email);
  if (!user) {
    user = await userQueries.create({
      email,
      password_hash: "local-dev-no-password",
      name: "Local Developer",
    });
    console.log(`[local] Created default user: ${user.email} (${user.id})`);
  }

  // Check if the well-known API key already exists
  const keyHash = hashApiKey(LOCAL_API_KEY);
  const existing = await apiKeyQueries.findByHash(keyHash);

  if (!existing) {
    await apiKeyQueries.create({
      user_id: user.id,
      key_hash: keyHash,
      name: "Local Dev Key",
      prefix: LOCAL_API_KEY.slice(0, 10),
    });
    console.log("[local] Created default API key");
  }

  return { userId: user.id, apiKey: LOCAL_API_KEY };
}

// ── Auth middleware (simplified) ────────────────────────────────────

function localAuth(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
): void {
  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error:
        'Missing X-API-Key header. Use: -H "X-API-Key: pk_local_dev"',
    });
    return;
  }

  const keyHash = hashApiKey(apiKey);

  apiKeyQueries
    .findByHash(keyHash)
    .then((result) => {
      if (!result) {
        throw new AuthError("Invalid API key");
      }
      apiKeyQueries.updateLastUsed(result.id).catch(() => {});
      req.userId = result.user.id;
      req.userPlan = result.user.plan;
      req.user = result.user;
      next();
    })
    .catch(next);
}

// ── Usage limit middleware (simplified) ─────────────────────────────

function checkUsageLimit(
  req: AuthenticatedRequest,
  _res: express.Response,
  next: express.NextFunction
): void {
  const plan = (req.userPlan || "free") as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];
  if (!limits) return next();

  const scanLimit = limits.scansPerMonth;
  if (scanLimit === Infinity) return next();

  const userId = req.userId;
  if (!userId) return next();

  usageQueries
    .getMonthlyUsage(userId)
    .then((currentUsage) => {
      if (currentUsage >= scanLimit) {
        return next(
          new AppError(
            `Monthly scan limit reached (${currentUsage}/${scanLimit}).`,
            429
          )
        );
      }
      next();
    })
    .catch(next);
}

// ── Build Express app ───────────────────────────────────────────────

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any localhost origin in local dev
      if (!origin || origin.startsWith("http://localhost")) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// ── Health ──────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    mode: "local",
    version: "0.1.0-local",
    timestamp: new Date().toISOString(),
  });
});

// ── JWT Auth Routes (for frontend testing) ──────────────────────────

import jsonwebtoken from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = "local-dev-jwt-secret";

app.post("/api/auth/register", async (req, res, next): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email and password required" });
      return;
    }
    let user = await userQueries.findByEmail(email);
    if (user) {
      res.status(409).json({ success: false, message: "Email already registered" });
      return;
    }
    const password_hash = await bcrypt.hash(password, 10);
    user = await userQueries.create({ email, password_hash, name: name || email.split("@")[0] });
    const token = jsonwebtoken.sign({ userId: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan, createdAt: user.created_at } } });
  } catch (err) { next(err); }
});

app.post("/api/auth/login", async (req, res, next): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email and password required" });
      return;
    }
    const user = await userQueries.findByEmail(email);
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }
    // For seeded user with no real password
    if (user.password_hash !== "local-dev-no-password") {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ success: false, message: "Invalid email or password" });
        return;
      }
    }
    const token = jsonwebtoken.sign({ userId: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan, createdAt: user.created_at } } });
  } catch (err) { next(err); }
});

// Also support Bearer token auth (in addition to API key)
function localAuthJwtOrApiKey(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = jsonwebtoken.verify(authHeader.slice(7), JWT_SECRET) as { userId: string; email: string; plan: string };
      userQueries.findById(decoded.userId).then((user) => {
        if (!user) return next(new AuthError("User not found"));
        req.userId = user.id;
        req.userPlan = user.plan;
        req.user = user;
        next();
      }).catch(next);
      return;
    } catch {
      // Fall through to API key auth
    }
  }
  // Fallback to API key
  localAuth(req, res, next);
}

// ── Public Scan Routes (no auth) ────────────────────────────────────

const PUBLIC_SCAN_LIMIT = 5;
const PUBLIC_SCAN_WINDOW_MS = 60 * 60 * 1000;
const publicIpHits: Map<string, number[]> = new Map();

setInterval(() => {
  const cutoff = Date.now() - PUBLIC_SCAN_WINDOW_MS;
  for (const [ip, timestamps] of publicIpHits.entries()) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      publicIpHits.delete(ip);
    } else {
      publicIpHits.set(ip, valid);
    }
  }
}, 10 * 60 * 1000).unref();

const publicScanSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

app.post("/api/scan/public", async (req, res, next) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const cutoff = now - PUBLIC_SCAN_WINDOW_MS;
    const timestamps = (publicIpHits.get(ip) || []).filter((t) => t > cutoff);

    if (timestamps.length >= PUBLIC_SCAN_LIMIT) {
      res.status(429).json({
        success: false,
        error: "Rate limit reached. Create a free account for unlimited scans.",
        signupUrl: "/signup",
      });
      return;
    }

    const parsed = publicScanSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid request",
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { url } = parsed.data;

    const scan = await scanQueries.create({
      user_id: null,
      url,
      checks: ["accessibility", "security", "performance"],
      pages: [],
    });

    timestamps.push(now);
    publicIpHits.set(ip, timestamps);

    await localQueueService.addScanJob({
      scanId: scan.id,
      url,
    });

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
});

app.get("/api/scan/public/:id", async (req, res, next) => {
  try {
    const scan = await scanQueries.findById(req.params.id);
    if (!scan) throw new NotFoundError("Scan");
    if (scan.user_id !== null) throw new NotFoundError("Scan");

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
});

// ── Scan Routes ─────────────────────────────────────────────────────

// POST /api/scans - create a new scan
app.post(
  "/api/scans",
  localAuthJwtOrApiKey,
  checkUsageLimit,
  async (req: AuthenticatedRequest, res, next) => {
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

// GET /api/scans - list scans
const listScansSchema = z.object({
  projectId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["date", "score"]).default("date"),
});

app.get(
  "/api/scans",
  localAuthJwtOrApiKey,
  async (req: AuthenticatedRequest, res, next) => {
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

// GET /api/scans/:id - get scan details
app.get(
  "/api/scans/:id",
  localAuthJwtOrApiKey,
  async (req: AuthenticatedRequest, res, next) => {
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

// GET /api/scans/:id/report - PDF report
app.get(
  "/api/scans/:id/report",
  localAuthJwtOrApiKey,
  async (req: AuthenticatedRequest, res, next) => {
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

// ── Project Routes ──────────────────────────────────────────────────

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

app.post(
  "/api/projects",
  localAuthJwtOrApiKey,
  async (req: AuthenticatedRequest, res, next) => {
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

app.get(
  "/api/projects",
  localAuthJwtOrApiKey,
  async (req: AuthenticatedRequest, res, next) => {
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

app.get(
  "/api/projects/:id",
  localAuthJwtOrApiKey,
  async (req: AuthenticatedRequest, res, next) => {
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

app.get(
  "/api/projects/:id/history",
  localAuthJwtOrApiKey,
  async (req: AuthenticatedRequest, res, next) => {
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

app.patch(
  "/api/projects/:id",
  localAuthJwtOrApiKey,
  async (req: AuthenticatedRequest, res, next) => {
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

app.delete(
  "/api/projects/:id",
  localAuthJwtOrApiKey,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const deleted = await projectQueries.delete(req.params.id, req.userId!);
      if (!deleted) throw new NotFoundError("Project");
      res.json({ success: true, data: { message: "Project deleted" } });
    } catch (err) {
      next(err);
    }
  }
);

// ── Billing Routes (mocked for local dev) ───────────────────────────

const FREE_PLAN = {
  id: "free",
  name: "Free",
  scansPerMonth: 10,
  requestsPerMinute: 5,
  features: [
    "10 scans per month",
    "Basic accessibility checks",
    "7-day report retention",
  ],
  price: 0,
};

app.get("/api/billing/plan", localAuthJwtOrApiKey, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    data: {
      currentPlan: FREE_PLAN,
      availablePlans: [FREE_PLAN],
    },
  });
});

app.get(
  "/api/billing/usage",
  localAuthJwtOrApiKey,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const usage = await usageQueries.getMonthlyUsage(req.userId!);
      res.json({
        success: true,
        data: {
          currentUsage: usage,
          limit: 10,
          plan: "free",
          resetDate: new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            1
          ).toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

app.post("/api/billing/checkout", localAuthJwtOrApiKey, (_req, res) => {
  res.json({
    success: false,
    error: "Billing is disabled in local dev mode.",
  });
});

app.post("/api/billing/portal", localAuthJwtOrApiKey, (_req, res) => {
  res.json({
    success: false,
    error: "Billing is disabled in local dev mode.",
  });
});

app.post("/api/billing/webhook", (_req, res) => {
  res.json({ success: true, data: { received: true } });
});

// ── Auth Routes (simplified for local dev) ──────────────────────────

app.get("/api/auth/me", localAuthJwtOrApiKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await userQueries.findById(req.userId!);
    if (!user) throw new NotFoundError("User");
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

app.get(
  "/api/auth/api-keys",
  localAuthJwtOrApiKey,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const keys = await apiKeyQueries.findByUserId(req.userId!);
      res.json({
        success: true,
        data: keys.map((k) => ({
          id: k.id,
          name: k.name,
          prefix: k.prefix,
          lastUsedAt: k.last_used_at,
          createdAt: k.created_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── Error Handler ───────────────────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err instanceof AppError) {
      const body: Record<string, unknown> = {
        success: false,
        error: err.message,
      };
      if (err instanceof ValidationError && err.fieldErrors) {
        body.fieldErrors = err.fieldErrors;
      }
      res.status(err.statusCode).json(body);
      return;
    }

    console.error("Unhandled error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
);

// ── Start Server ────────────────────────────────────────────────────

async function start() {
  // Initialize local queue
  await localQueueService.initialize();

  // Seed database with default user and API key
  const { userId, apiKey } = await seedDatabase();

  console.log("");
  console.log("┌─────────────────────────────────────────────────┐");
  console.log("│           PreShip API - Local Dev Mode           │");
  console.log("├─────────────────────────────────────────────────┤");
  console.log(`│  Database: SQLite (apps/api/data/preship.db)     │`);
  console.log(`│  Queue:    In-memory (no Redis)                  │`);
  console.log(`│  Billing:  Mocked (free plan)                    │`);
  console.log("├─────────────────────────────────────────────────┤");
  console.log(`│  Default API key: ${apiKey.padEnd(29)}│`);
  console.log("└─────────────────────────────────────────────────┘");
  console.log("");

  app.listen(PORT, () => {
    console.log(`PreShip API running on http://localhost:${PORT}`);
    console.log("");
    console.log("Try it:");
    console.log(
      `  curl -X POST http://localhost:${PORT}/api/scans \\`
    );
    console.log('    -H "Content-Type: application/json" \\');
    console.log(`    -H "X-API-Key: ${apiKey}" \\`);
    console.log('    -d \'{"url":"https://example.com"}\'');
    console.log("");
  });
}

start().catch((err) => {
  console.error("Failed to start local server:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down...");
  await localQueueService.shutdown();
  db.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\nSIGINT received, shutting down...");
  await localQueueService.shutdown();
  db.close();
  process.exit(0);
});

export default app;
