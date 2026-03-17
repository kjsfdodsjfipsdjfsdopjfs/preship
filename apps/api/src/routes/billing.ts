import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { config } from "../config";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../middleware/auth";
import {
  stripe,
  PLANS,
  createCheckoutSession,
  createPortalSession,
  handleWebhookEvent,
  getUsageStats,
} from "../services/stripe";
import { ValidationError } from "../utils/errors";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  planId: z.enum(["pro", "team", "enterprise"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const portalSchema = z.object({
  returnUrl: z.string().url(),
});

// ─── POST /billing/checkout ──────────────────────────────────────────

router.post(
  "/checkout",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          "Validation failed",
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        );
      }

      const { planId, successUrl, cancelUrl } = parsed.data;
      const session = await createCheckoutSession(
        req.userId!,
        planId,
        successUrl,
        cancelUrl
      );

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          url: session.url,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /billing/portal ────────────────────────────────────────────

router.post(
  "/portal",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = portalSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          "Validation failed",
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        );
      }

      const session = await createPortalSession(
        req.userId!,
        parsed.data.returnUrl
      );

      res.json({
        success: true,
        data: { url: session.url },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /billing/webhook ───────────────────────────────────────────
// NOTE: This route needs raw body. The main app must use express.raw()
// for this specific path instead of express.json().

router.post(
  "/webhook",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!stripe) {
        res
          .status(503)
          .json({ success: false, error: "Stripe is not configured" });
        return;
      }

      const sig = req.headers["stripe-signature"] as string;
      if (!sig) {
        res
          .status(400)
          .json({ success: false, error: "Missing Stripe signature" });
        return;
      }

      let event;
      try {
        // req.body is a raw Buffer thanks to express.raw() in index.ts
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          config.stripeWebhookSecret
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Invalid signature";
        console.error(
          "[billing] Stripe webhook signature verification failed:",
          message
        );
        res
          .status(400)
          .json({ success: false, error: "Invalid webhook signature" });
        return;
      }

      await handleWebhookEvent(event);

      res.json({ success: true, data: { received: true } });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /billing/usage ──────────────────────────────────────────────

router.get(
  "/usage",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const usage = await getUsageStats(req.userId!);
      res.json({ success: true, data: usage });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /billing/plan ───────────────────────────────────────────────

router.get(
  "/plan",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const userPlan = req.userPlan ?? "free";
    const plan = PLANS[userPlan] ?? PLANS.free;

    res.json({
      success: true,
      data: {
        currentPlan: {
          id: plan.id,
          name: plan.name,
          scansPerMonth: plan.scansPerMonth,
          requestsPerMinute: plan.requestsPerMinute,
          features: plan.features,
          price: plan.price,
        },
        availablePlans: Object.values(PLANS).map((p) => ({
          id: p.id,
          name: p.name,
          scansPerMonth: p.scansPerMonth,
          features: p.features,
          price: p.price,
        })),
      },
    });
  }
);

export default router;
