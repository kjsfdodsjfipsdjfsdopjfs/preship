import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config";
import { userQueries, apiKeyQueries, type User } from "../models/index";
import { AuthError } from "../utils/errors";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userPlan?: string;
  user?: User;
}

interface JwtPayload {
  userId: string;
  email: string;
  plan: string;
}

function hashApiKey(key: string): string {
  return crypto
    .createHmac("sha256", config.apiKeySalt)
    .update(key)
    .digest("hex");
}

async function extractUserFromBearer(
  token: string
): Promise<{ userId: string; plan: string; user: User | null } | null> {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await userQueries.findById(payload.userId);
    if (!user) return null;
    return { userId: user.id, plan: user.plan, user };
  } catch {
    return null;
  }
}

async function extractUserFromApiKey(
  key: string
): Promise<{ userId: string; plan: string; user: User | null } | null> {
  const keyHash = hashApiKey(key);
  const result = await apiKeyQueries.findByHash(keyHash);
  if (!result) return null;

  // Update last used timestamp in the background
  apiKeyQueries.updateLastUsed(result.id).catch(() => {});

  return { userId: result.user.id, plan: result.user.plan, user: result.user };
}

/**
 * Required authentication middleware.
 * Supports both Bearer token and X-API-Key header.
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  authenticateRequest(req)
    .then((result) => {
      if (!result) {
        throw new AuthError("Invalid or missing authentication credentials");
      }
      req.userId = result.userId;
      req.userPlan = result.plan;
      req.user = result.user ?? undefined;
      next();
    })
    .catch(next);
}

/**
 * Alias for authMiddleware for consistency with route files.
 */
export const requireAuth = authMiddleware;

/**
 * Optional auth - attaches user info if available but doesn't reject.
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  authenticateRequest(req)
    .then((result) => {
      if (result) {
        req.userId = result.userId;
        req.userPlan = result.plan;
        req.user = result.user ?? undefined;
      }
      next();
    })
    .catch(next);
}

async function authenticateRequest(
  req: Request
): Promise<{ userId: string; plan: string; user: User | null } | null> {
  // Check for Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return extractUserFromBearer(token);
  }

  // Check for API key
  const apiKey = req.headers["x-api-key"] as string | undefined;
  if (apiKey) {
    return extractUserFromApiKey(apiKey);
  }

  return null;
}

/**
 * Generate a JWT for a user.
 */
export function generateToken(user: {
  id: string;
  email: string;
  plan: string;
}): string {
  return jwt.sign(
    { userId: user.id, email: user.email, plan: user.plan } satisfies JwtPayload,
    config.jwtSecret as string,
    { expiresIn: config.jwtExpiresIn as unknown as jwt.SignOptions["expiresIn"] }
  );
}

/**
 * Generate a new API key. Returns the raw key (show once) and the hash (store).
 */
export function generateApiKey(): {
  rawKey: string;
  keyHash: string;
  prefix: string;
} {
  const rawKey = `sc_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = rawKey.slice(0, 10);
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyHash, prefix };
}
