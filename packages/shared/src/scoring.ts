import { SEVERITY_WEIGHTS, SCORE_THRESHOLDS, SCORE_LABELS } from "./constants";
import type { Violation, CategoryScore, CheckCategory } from "./types";

/**
 * Calculate a 0-100 score for a set of violations.
 * Starts at 100 and deducts points based on severity weights.
 * Score never goes below 0.
 */
export function calculateScore(violations: Violation[]): number {
  const totalDeduction = violations.reduce((sum, v) => {
    return sum + (SEVERITY_WEIGHTS[v.severity] ?? 0);
  }, 0);

  return Math.max(0, Math.round(100 - totalDeduction));
}

/**
 * Calculate per-category scores from a list of violations.
 */
export function calculateCategoryScores(
  violations: Violation[],
  totalChecksPerCategory: Record<CheckCategory, number>
): CategoryScore[] {
  const categories: CheckCategory[] = [
    "accessibility",
    "security",
    "performance",
    "seo",
    "privacy",
    "mobile",
  ];

  return categories.map((category) => {
    const categoryViolations = violations.filter(
      (v) => v.category === category
    );
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
