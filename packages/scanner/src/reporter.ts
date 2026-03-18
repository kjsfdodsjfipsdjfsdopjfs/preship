import {
  calculateCategoryScores,
  type ScanResult,
  type Violation,
  type FixSuggestion,
  type CheckCategory,
  type CategoryScore,
  type Severity,
} from "@preship/shared";
import type { PerformanceMetrics } from "./types";

/**
 * Input data needed to build a scan report.
 */
export interface ReportInput {
  id: string;
  projectId: string;
  url: string;
  violations: Violation[];
  suggestions: FixSuggestion[];
  pagesScanned: number;
  blockedPages?: number;
  duration: number;
  metrics?: PerformanceMetrics;
  checksRun?: CheckCategory[];
  totalChecksPerCategory?: Record<CheckCategory, number>;
}

/**
 * Extended structured report with summary statistics.
 */
export interface StructuredReport {
  /** The full ScanResult for persistence */
  result: ScanResult;

  /** Summary statistics */
  summary: ReportSummary;

  /** Violations sorted by severity (critical first) */
  sortedViolations: Violation[];

  /** Fix suggestions sorted by impact (critical fixes first) */
  sortedFixes: FixSuggestion[];
}

/**
 * Summary statistics for a report.
 */
export interface ReportSummary {
  /** Overall weighted score (0-100), uses category weights: a11y 40%, security 35%, perf 25% */
  weightedScore: number;

  /** Total number of violations found */
  totalViolations: number;

  /** Violations broken down by severity */
  bySeverity: Record<Severity, number>;

  /** Violations broken down by check category */
  byCategory: Record<CheckCategory, number>;

  /** Total number of passing checks */
  totalPasses: number;

  /** Number of fix suggestions with high confidence (>= 0.85) */
  autoFixableCount: number;

  /** Number of pages scanned */
  pagesScanned: number;
}

/** Severity sort order for ranking violations: critical first */
const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

/** Category weights for calculating the overall weighted score */
const CATEGORY_WEIGHTS: Record<CheckCategory, number> = {
  accessibility: 0.25,
  security: 0.25,
  performance: 0.15,
  seo: 0.15,
  privacy: 0.10,
  mobile: 0.10,
};

/**
 * Build a structured ScanResult from raw scan data.
 *
 * Calculates per-category scores (using the shared scoring module)
 * and the overall score, then assembles a complete ScanResult.
 *
 * @param input - Raw scan data including violations and metrics
 * @returns Complete ScanResult ready for persistence
 */
export function buildReport(input: ReportInput): ScanResult {
  const totalChecksPerCategory: Record<CheckCategory, number> =
    input.totalChecksPerCategory ?? {
      accessibility: 50, // approximate number of axe-core rules
      security: 15,
      performance: 10,
      seo: 10,
      privacy: 5,
      mobile: 6,
    };

  const categories = calculateCategoryScores(
    input.violations,
    totalChecksPerCategory
  );

  // Use weighted scoring instead of simple average
  const overallScore = calculateWeightedScore(categories);

  return {
    id: input.id,
    projectId: input.projectId,
    url: input.url,
    status: "completed",
    overallScore,
    categories,
    violations: input.violations,
    suggestions: input.suggestions,
    pagesScanned: input.pagesScanned,
    blockedPages: input.blockedPages ?? 0,
    duration: input.duration,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

/**
 * Generate a full structured report with sorted violations,
 * sorted fixes, and summary statistics.
 *
 * This is the primary function for producing API-ready report output.
 *
 * @param input - Raw scan data
 * @returns StructuredReport with sorted data and summary
 */
export function generateStructuredReport(
  input: ReportInput
): StructuredReport {
  const result = buildReport(input);

  // Sort violations by severity (critical first)
  const sortedViolations = [...result.violations].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
  );

  // Sort fix suggestions: by severity of associated violation, then by confidence
  const violationSeverityMap = new Map<string, Severity>();
  for (const v of result.violations) {
    violationSeverityMap.set(v.id, v.severity);
  }
  const sortedFixes = [...input.suggestions].sort((a, b) => {
    const sevA = violationSeverityMap.get(a.violationId) ?? "info";
    const sevB = violationSeverityMap.get(b.violationId) ?? "info";
    const orderDiff =
      (SEVERITY_ORDER[sevA] ?? 4) - (SEVERITY_ORDER[sevB] ?? 4);
    if (orderDiff !== 0) return orderDiff;
    return b.confidence - a.confidence;
  });

  // Build summary
  const summary = buildSummary(
    result.violations,
    input.suggestions,
    result.categories,
    result.pagesScanned
  );

  return {
    result,
    summary,
    sortedViolations,
    sortedFixes,
  };
}

/**
 * Calculate the overall weighted score from category scores.
 *
 * Uses fixed weights: accessibility 40%, security 35%, performance 25%.
 * This ensures that accessibility gets the most weight, reflecting its
 * importance for inclusive web experiences.
 */
function calculateWeightedScore(categories: CategoryScore[]): number {
  if (categories.length === 0) return 100;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const cat of categories) {
    const weight = CATEGORY_WEIGHTS[cat.category] ?? 0;
    weightedSum += cat.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 100;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Build summary statistics from violations and category scores.
 */
function buildSummary(
  violations: Violation[],
  fixes: FixSuggestion[],
  categories: CategoryScore[],
  pagesScanned: number
): ReportSummary {
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  const byCategory: Record<CheckCategory, number> = {
    accessibility: 0,
    security: 0,
    performance: 0,
    seo: 0,
    privacy: 0,
    mobile: 0,
  };

  for (const v of violations) {
    bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
  }

  const totalPasses = categories.reduce((sum, c) => sum + c.passed, 0);
  const autoFixableCount = fixes.filter((f) => f.confidence >= 0.85).length;
  const weightedScore = calculateWeightedScore(categories);

  return {
    weightedScore,
    totalViolations: violations.length,
    bySeverity,
    byCategory,
    totalPasses,
    autoFixableCount,
    pagesScanned,
  };
}

/**
 * Format a ScanResult as a human-readable text report.
 * Useful for CLI output, logging, and notifications.
 *
 * @param result - The scan result to format
 * @returns Multi-line text summary
 */
export function formatTextReport(result: ScanResult): string {
  const lines: string[] = [];

  lines.push(`PreShip Scan Report`);
  lines.push(`${"=".repeat(50)}`);
  lines.push(`URL: ${result.url}`);
  lines.push(`Overall Score: ${result.overallScore}/100`);
  lines.push(`Pages Scanned: ${result.pagesScanned}`);
  lines.push(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
  lines.push("");

  for (const cat of result.categories) {
    lines.push(
      `${cat.category.toUpperCase()}: ${cat.score}/100 (${cat.violations} issues, ${cat.passed} passed)`
    );
  }

  if (result.violations.length > 0) {
    lines.push("");
    lines.push(`Issues (${result.violations.length} total)`);
    lines.push(`${"-".repeat(50)}`);

    // Sort by severity for display
    const sorted = [...result.violations].sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
    );

    for (const v of sorted) {
      lines.push(
        `[${v.severity.toUpperCase()}] ${v.category} - ${v.message}`
      );
      if (v.element) {
        lines.push(`  Element: ${v.element.substring(0, 100)}`);
      }
      if (v.help) {
        lines.push(`  Help: ${v.help}`);
      }
    }
  }

  if (result.suggestions.length > 0) {
    lines.push("");
    lines.push(`Fix Suggestions (${result.suggestions.length})`);
    lines.push(`${"-".repeat(50)}`);

    for (const fix of result.suggestions) {
      lines.push(`- ${fix.description}`);
      if (fix.confidence >= 0.85) {
        lines.push(`  [Auto-fixable, confidence: ${(fix.confidence * 100).toFixed(0)}%]`);
      }
    }
  }

  return lines.join("\n");
}
