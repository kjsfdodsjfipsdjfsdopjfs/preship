import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { userQueries, apiKeyQueries } from "../models/index";
import {
  authMiddleware,
  generateToken,
  generateApiKey,
  type AuthenticatedRequest,
} from "../middleware/auth";
import { authRateLimit } from "../middleware/rateLimit";
import { AuthError, ValidationError, NotFoundError } from "../utils/errors";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(255),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
});

// ─── POST /auth/register ─────────────────────────────────────────────

router.post(
  "/register",
  authRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          "Validation failed",
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        );
      }

      const { email, password, name } = parsed.data;

      const existing = await userQueries.findByEmail(email);
      if (existing) {
        throw new ValidationError(
          "An account with this email already exists"
        );
      }

      const password_hash = await bcrypt.hash(password, 12);
      const user = await userQueries.create({
        email,
        password_hash,
        name,
      });
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            createdAt: user.created_at,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /auth/login ────────────────────────────────────────────────

router.post(
  "/login",
  authRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          "Validation failed",
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        );
      }

      const { email, password } = parsed.data;

      const user = await userQueries.findByEmail(email);
      if (!user) {
        throw new AuthError("Invalid email or password");
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        throw new AuthError("Invalid email or password");
      }

      const token = generateToken(user);

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            createdAt: user.created_at,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /auth/me ────────────────────────────────────────────────────

router.get(
  "/me",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        throw new AuthError();
      }

      const user = await userQueries.findById(req.userId);
      if (!user) {
        throw new NotFoundError("User");
      }

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

// ─── POST /auth/api-keys ────────────────────────────────────────────

router.post(
  "/api-keys",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createApiKeySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          "Validation failed",
          parsed.error.flatten().fieldErrors as Record<string, string[]>
        );
      }

      const { name } = parsed.data;
      const { rawKey, keyHash, prefix } = generateApiKey();

      const apiKey = await apiKeyQueries.create({
        user_id: req.userId!,
        key_hash: keyHash,
        name,
        prefix,
      });

      res.status(201).json({
        success: true,
        data: {
          id: apiKey.id,
          name: apiKey.name,
          prefix: apiKey.prefix,
          key: rawKey, // Only returned once at creation
          createdAt: apiKey.created_at,
          message:
            "Store this key securely. It will not be shown again.",
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
  authMiddleware,
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

// ─── DELETE /auth/api-keys/:id ──────────────────────────────────────

router.delete(
  "/api-keys/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const deleted = await apiKeyQueries.delete(
        req.params.id,
        req.userId!
      );
      if (!deleted) {
        throw new NotFoundError("API key");
      }
      res.json({
        success: true,
        data: { message: "API key revoked" },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
