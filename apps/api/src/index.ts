import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { standardRateLimit } from "./middleware/rateLimit";
import { requestLogger } from "./middleware/requestLogger";
import { AppError, ValidationError } from "./utils/errors";
import { logger } from "./utils/logger";
import scanRoutes from "./routes/scan";
import authRoutes from "./routes/auth";
import billingRoutes from "./routes/billing";
import projectRoutes from "./routes/projects";
import healthRoutes from "./routes/health";
import { queueService } from "./services/queue";
import { runMigrations } from "./migrate";
import { userQueries } from "./models/index";

const app = express();

// Trust proxy (Railway runs behind a reverse proxy)
app.set("trust proxy", 1);

// ── Global Middleware ─────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: [
      config.webUrl,
      "https://preship.dev",
      "http://localhost:3000",
    ].filter((v, i, a) => a.indexOf(v) === i),
    credentials: true,
  })
);

// Stripe webhook needs the raw body for signature verification.
// Mount raw body parser BEFORE express.json() for the webhook path.
app.use(
  "/api/billing/webhook",
  express.raw({ type: "application/json" })
);

// Parse JSON for all other routes
app.use(express.json({ limit: "10mb" }));
app.use(standardRateLimit);
app.use(requestLogger);

// ── Health Check ─────────────────────────────────────────────────────

app.use(healthRoutes);

// ── API Routes ───────────────────────────────────────────────────────

app.use("/api/scans", scanRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/projects", projectRoutes);

// ── Internal Admin (secured by JWT secret) ──────────────────────────

app.post("/internal/upgrade-plan", async (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (secret !== config.jwtSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { email, plan } = req.body;
  if (!email || !plan) {
    res.status(400).json({ error: "email and plan required" });
    return;
  }
  try {
    const user = await userQueries.findByEmail(email);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await userQueries.updatePlan(user.id, plan);
    res.json({ success: true, userId: user.id, plan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Error Handler ────────────────────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    // Known application errors carry a statusCode
    if (err instanceof AppError) {
      const body: Record<string, unknown> = {
        success: false,
        error: err.message,
      };

      // Attach field-level validation errors when present
      if (err instanceof ValidationError && err.fieldErrors) {
        body.fieldErrors = err.fieldErrors;
      }

      res.status(err.statusCode).json(body);
      return;
    }

    // Unexpected errors
    logger.error("Unhandled error", {
      error: err.message,
      stack: err.stack,
      requestId: _req.requestId,
    });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      ...(config.nodeEnv === "development" ? { message: err.message } : {}),
    });
  }
);

// ── Start Server ─────────────────────────────────────────────────────

async function start() {
  // Run database migrations before anything else
  await runMigrations();

  // Initialize background job queue (non-blocking - won't crash if Redis is down)
  queueService.initialize().catch((err) => {
    logger.warn("Queue initialization skipped", {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  app.listen(config.port, () => {
    logger.info("PreShip API started", {
      port: config.port,
      environment: config.nodeEnv,
    });
  });
}

start().catch((err) => {
  logger.error("Failed to start server", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down");
  await queueService.shutdown();
  process.exit(0);
});

export default app;
