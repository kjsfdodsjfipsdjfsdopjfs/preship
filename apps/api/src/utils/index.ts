/**
 * Generate a hash of an API key for secure storage.
 * Uses HMAC-SHA256 with the configured salt for consistent hashing
 * across the application (matches middleware/auth.ts and local.ts).
 */
import crypto from "crypto";
import { config } from "../config";

export function hashApiKey(key: string): string {
  return crypto
    .createHmac("sha256", config.apiKeySalt)
    .update(key)
    .digest("hex");
}

/**
 * Create a standardized API error response.
 */
export function apiError(
  status: number,
  message: string,
  details?: unknown
): { status: number; body: { error: string; details?: unknown } } {
  return {
    status,
    body: { error: message, ...(details ? { details } : {}) },
  };
}

/**
 * Paginate an array of items.
 */
export function paginate<T>(
  items: T[],
  page: number,
  limit: number
): { data: T[]; total: number; page: number; limit: number; pages: number } {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
    pages: Math.ceil(items.length / limit),
  };
}
