/**
 * Simplified auth middleware for local development.
 * Accepts a hardcoded API key or any X-API-Key header.
 * Attaches a default local user to all authenticated requests.
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import type { User } from "../models/index";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userPlan?: string;
  user?: User;
}

// These will be set by local.ts after seeding the database
let _defaultUserId: string = "local-dev-user";
let _defaultApiKeyHash: string = "";
let _apiKeySalt: string = "dev-salt-change-me";

// Injected query functions to avoid importing from pg-based models
let _apiKeyQueries: any;
let _userQueries: any;

export function configureLocalAuth(opts: {
  defaultUserId: string;
  apiKeyHash: string;
  apiKeySalt: string;
  apiKeyQueries: any;
  userQueries: any;
}) {
  _defaultUserId = opts.defaultUserId;
  _defaultApiKeyHash = opts.apiKeyHash;
  _apiKeySalt = opts.apiKeySalt;
  _apiKeyQueries = opts.apiKeyQueries;
  _userQueries = opts.userQueries;
}

function hashApiKey(key: string): string {
  return crypto
    .createHmac("sha256", _apiKeySalt)
    .update(key)
    .digest("hex");
}

/**
 * Local auth middleware. Checks X-API-Key header against the
 * SQLite-stored API keys (or the well-known local dev key).
 */
export function localAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: "Missing X-API-Key header. Use the API key printed at startup.",
    });
    return;
  }

  const keyHash = hashApiKey(apiKey);

  // Look up the key in SQLite
  (async () => {
    if (_apiKeyQueries) {
      const result = await _apiKeyQueries.findByHash(keyHash);
      if (result) {
        await _apiKeyQueries.updateLastUsed(result.id).catch(() => {});
        req.userId = result.user.id;
        req.userPlan = result.user.plan;
        req.user = result.user;
        return next();
      }
    }

    // Fallback: check hardcoded hash
    if (keyHash === _defaultApiKeyHash) {
      const user = _userQueries
        ? await _userQueries.findById(_defaultUserId)
        : null;
      req.userId = _defaultUserId;
      req.userPlan = "free";
      req.user = user ?? undefined;
      return next();
    }

    res.status(401).json({
      success: false,
      error: "Invalid API key.",
    });
  })().catch(next);
}
