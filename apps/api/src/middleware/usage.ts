import { Response, NextFunction } from "express";
import { PLAN_LIMITS } from "@preship/shared";
import { usageQueries } from "../models/index";
import { UsageLimitError } from "../utils/errors";
import type { AuthenticatedRequest } from "./auth";

/**
 * Middleware to check plan usage limits before allowing scan operations.
 * Must be used after authMiddleware so req.userId and req.userPlan are set.
 *
 * Plan scan limits (per month):
 *   Free: 10, Pro: 200, Team: 1000, Enterprise: unlimited
 */
export function checkUsageLimit(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const plan = (req.userPlan || "free") as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];

  if (!limits) {
    res.status(403).json({ success: false, error: "Invalid plan" });
    return;
  }

  const scanLimit = limits.scansPerMonth;

  // Enterprise has unlimited scans
  if (scanLimit === Infinity) {
    (req as any).planLimits = limits;
    return next();
  }

  const userId = req.userId;
  if (!userId) {
    return next();
  }

  usageQueries
    .getMonthlyUsage(userId)
    .then((currentUsage) => {
      if (currentUsage >= scanLimit) {
        throw new UsageLimitError(plan, currentUsage, scanLimit);
      }

      // Attach limits and current usage for downstream use
      (req as any).planLimits = limits;
      (req as any).currentUsage = currentUsage;

      next();
    })
    .catch(next);
}

/**
 * Returns the scan limit for a given plan.
 */
export function getScanLimit(plan: string): number {
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
  return limits?.scansPerMonth ?? PLAN_LIMITS.free.scansPerMonth;
}
