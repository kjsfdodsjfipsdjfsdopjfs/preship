import { SEVERITY_WEIGHTS, SCORE_THRESHOLDS, SCORE_LABELS, SHIP_READINESS_THRESHOLDS, PILLAR_CATEGORIES, PILLAR_WEIGHTS, SCORING_MODE } from "./constants";
import type { Violation, CategoryScore, CheckCategory, CheckResult, PillarScore, Pillar, ShipReadiness } from "./types";

/**
 * Calculate a 0-100 score for a set of violations.
 * Uses exponential decay so scores remain meaningful across the full
 * range of violation counts instead of hitting 0 after ~10 issues.
 *
 * Calibration (approximate):
 *   weightedSum  50 → ~86
 *   weightedSum 150 → ~64
 *   weightedSum 500 → ~22
 *   weightedSum 1000 → ~5
 */
export function calculateScore(violations: Violation[]): number {
  if (violations.length === 0) return 100;

  // Calculate weighted violation impact
  const weightedSum = violations.reduce((sum, v) => {
    return sum + (SEVERITY_WEIGHTS[v.severity] ?? 0);
  }, 0);

  // Exponential decay: score = 100 * e^(-k * weightedSum)
  // k=0.003 calibrated so real-world sites get differentiated scores.
  // Most sites have 50-500 weighted violations — this range maps to ~86-22.
  const k = 0.003;
  const score = 100 * Math.exp(-k * weightedSum);

  return Math.max(0, Math.round(score));
}

/**
 * Calculate a cumulative score from check results.
 * Score = (earned points / max points) * 100.
 * Used for product and business categories where you START at 0 and earn points.
 */
export function calculateCumulativeScore(checks: CheckResult[]): number {
  if (checks.length === 0) return 0;
  const maxPoints = checks.reduce((sum, c) => sum + c.maxPoints, 0);
  if (maxPoints === 0) return 0;
  const earnedPoints = checks.reduce((sum, c) => sum + c.points, 0);
  return Math.max(0, Math.min(100, Math.round((earnedPoints / maxPoints) * 100)));
}

/**
 * Calculate per-category scores from violations and check results.
 * Uses DUAL scoring model:
 * - Technical categories: penalty model (start at 100, deduct for violations)
 * - Product/Business categories: cumulative model (start at 0, earn points per check)
 */
export function calculateCategoryScores(
  violations: Violation[],
  totalChecksPerCategory: Record<CheckCategory, number>,
  checkResults?: CheckResult[]
): CategoryScore[] {
  const categories: CheckCategory[] = [
    "accessibility",
    "security",
    "performance",
    "seo",
    "privacy",
    "mobile",
    "ux",
    "design",
    "human_appeal",
    "business",
    "revenue",
    "growth",
  ];

  return categories.map((category) => {
    const mode = SCORING_MODE[category];
    const categoryViolations = violations.filter(
      (v) => v.category === category
    );
    const categoryChecks = checkResults?.filter(
      (c) => c.category === category
    ) ?? [];

    if (mode === "cumulative" && categoryChecks.length > 0) {
      // Cumulative: score based on checks passed, not violations
      const passed = categoryChecks.filter((c) => c.passed).length;
      return {
        category,
        score: calculateCumulativeScore(categoryChecks),
        violations: categoryChecks.length - passed,
        passed,
        checks: categoryChecks,
      };
    }

    // Penalty: traditional violation-based scoring
    const totalChecks = totalChecksPerCategory[category] ?? 0;
    const passed = Math.max(0, totalChecks - categoryViolations.length);

    return {
      category,
      score: calculateScore(categoryViolations),
      violations: categoryViolations.length,
      passed,
    };
  });
}

/**
 * Calculate the overall score as a simple average of category scores.
 *
 * NOTE: The scanner reporter (@preship/scanner reporter.ts) uses a
 * weighted variant instead (a11y 40%, security 35%, perf 25%).
 * This simple average is provided as a utility for cases where
 * equal weighting is preferred.
 */
export function calculateOverallScore(categories: CategoryScore[]): number {
  if (categories.length === 0) return 100;

  const total = categories.reduce((sum, cat) => sum + cat.score, 0);
  return Math.round(total / categories.length);
}

/**
 * Get a human-readable label for a numeric score.
 */
export function getScoreLabel(
  score: number
): keyof typeof SCORE_LABELS {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return "EXCELLENT";
  if (score >= SCORE_THRESHOLDS.GOOD) return "GOOD";
  if (score >= SCORE_THRESHOLDS.NEEDS_WORK) return "NEEDS_WORK";
  return "POOR";
}

/**
 * Get the display text for a score label.
 */
export function getScoreDisplayText(score: number): string {
  return SCORE_LABELS[getScoreLabel(score)];
}

/**
 * Calculate pillar scores (Technical, Product, Business) from category scores.
 */
export function calculatePillarScores(categories: CategoryScore[]): PillarScore[] {
  const pillars: Pillar[] = ["technical", "product", "business"];

  return pillars.map((pillar) => {
    const pillarCats = PILLAR_CATEGORIES[pillar] ?? [];
    const pillarCategoryScores = categories.filter((c) =>
      pillarCats.includes(c.category)
    );

    const score =
      pillarCategoryScores.length > 0
        ? Math.round(
            pillarCategoryScores.reduce((sum, c) => sum + c.score, 0) /
              pillarCategoryScores.length
          )
        : 100;

    return {
      pillar,
      score,
      categories: pillarCategoryScores,
    };
  });
}

/**
 * Calculate weighted overall score using pillar weights.
 */
export function calculateWeightedOverallScore(pillars: PillarScore[]): number {
  if (pillars.length === 0) return 100;

  const weightedSum = pillars.reduce((sum, p) => {
    const weight = PILLAR_WEIGHTS[p.pillar] ?? 0;
    return sum + p.score * weight;
  }, 0);

  return Math.round(weightedSum);
}

/**
 * Get the Ship Readiness verdict based on the overall score.
 */
export function getShipReadiness(score: number): ShipReadiness {
  if (score >= SHIP_READINESS_THRESHOLDS.SHIP_IT) return "SHIP IT";
  if (score >= SHIP_READINESS_THRESHOLDS.ALMOST_READY) return "ALMOST READY";
  if (score >= SHIP_READINESS_THRESHOLDS.NEEDS_WORK) return "NEEDS WORK";
  return "DO NOT SHIP";
}
