/**
 * Local-dev billing routes.
 *
 * Returns mocked billing data - always free plan, no Stripe integration.
 */

import { Router, Response, NextFunction } from "express";
import {
  localAuthMiddleware,
  type AuthenticatedRequest,
} from "../middleware/local-auth";
import { usageQueries } from "../models/sqlite";

const router = Router();

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

// ─── GET /billing/plan ───────────────────────────────────────────────

router.get("/plan", localAuthMiddleware, (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      currentPlan: FREE_PLAN,
      availablePlans: [FREE_PLAN],
    },
  });
});

// ─── GET /billing/usage ──────────────────────────────────────────────

router.get(
  "/usage",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

// ─── POST /billing/checkout ─────────────────────────────────────────

router.post("/checkout", localAuthMiddleware, (_req, res) => {
  res.json({
    success: false,
    error: "Billing is disabled in local dev mode.",
  });
});

// ─── POST /billing/portal ───────────────────────────────────────────

router.post("/portal", localAuthMiddleware, (_req, res) => {
  res.json({
    success: false,
    error: "Billing is disabled in local dev mode.",
  });
});

// ─── POST /billing/webhook ──────────────────────────────────────────

router.post("/webhook", (_req, res) => {
  res.json({ success: true, data: { received: true } });
});

export default router;
