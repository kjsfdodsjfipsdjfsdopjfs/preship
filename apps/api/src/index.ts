import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { standardRateLimit } from "./middleware/rateLimit";
import { AppError, ValidationError } from "./utils/errors";
import scanRoutes from "./routes/scan";
import authRoutes from "./routes/auth";
import billingRoutes from "./routes/billing";
import projectRoutes from "./routes/projects";
import { queueService } from "./services/queue";
import { runMigrations } from "./migrate";

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: config.webUrl,
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

// ── Health Check ─────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ───────────────────────────────────────────────────────

app.use("/api/scans", scanRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/projects", projectRoutes);

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
    console.error("Unhandled error:", err);
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
    console.warn("Queue initialization skipped:", err);
  });

  app.listen(config.port, () => {
    console.log(`PreShip API running on http://localhost:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
}

start().catch(console.error);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down...");
  await queueService.shutdown();
  process.exit(0);
});

export default app;
