/**
 * Local-dev auth routes.
 *
 * Simplified auth endpoints for local development.
 * No registration/login (uses API key only), just /me and /api-keys listing.
 */

import { Router, Response, NextFunction } from "express";
import {
  localAuthMiddleware,
  type AuthenticatedRequest,
} from "../middleware/local-auth";
import { userQueries, apiKeyQueries } from "../models/sqlite";
import { NotFoundError } from "../utils/errors";

const router = Router();

// ─── GET /auth/me ────────────────────────────────────────────────────

router.get(
  "/me",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
  }
);

// ─── GET /auth/api-keys ─────────────────────────────────────────────

router.get(
  "/api-keys",
  localAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

export default router;
