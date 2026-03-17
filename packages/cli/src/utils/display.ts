import chalk from "chalk";
import type { ScanResult } from "@preship/shared";

/**
 * Render a full human-readable report to the terminal.
 */
export function renderFullReport(result: ScanResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold("  Results"));
  lines.push(chalk.dim("  " + "=".repeat(48)));
  lines.push("");

  const scoreColor =
    (result.overallScore ?? 0) >= 90
      ? chalk.green
      : (result.overallScore ?? 0) >= 70
        ? chalk.yellow
        : chalk.red;

  lines.push(
    `  Overall Score: ${scoreColor(String(result.overallScore ?? 0) + "/100")}`
  );
  lines.push(
    `  Pages Scanned: ${chalk.dim(String(result.pagesScanned ?? 0))}`
  );

  if (result.duration) {
    lines.push(
      `  Duration:      ${chalk.dim((result.duration / 1000).toFixed(1) + "s")}`
    );
  }

  lines.push("");

  if (result.categories && result.categories.length > 0) {
    for (const cat of result.categories) {
      const catColor =
        cat.score >= 90
          ? chalk.green
          : cat.score >= 70
            ? chalk.yellow
            : chalk.red;
      lines.push(
        `  ${cat.category.toUpperCase().padEnd(16)} ${catColor(
          cat.score + "/100"
        )}  (${cat.violations} issues, ${cat.passed} passed)`
      );
    }
    lines.push("");
  }

  if (result.violations && result.violations.length > 0) {
    lines.push(
      chalk.bold(`  Issues (${result.violations.length})`)
    );
    lines.push(chalk.dim("  " + "-".repeat(48)));

    for (const v of result.violations.slice(0, 20)) {
      const sevColor =
        v.severity === "critical"
          ? chalk.red
          : v.severity === "high"
            ? chalk.yellow
            : chalk.dim;
      lines.push(
        `  ${sevColor("[" + v.severity.toUpperCase() + "]")} ${v.category} - ${v.message}`
      );
    }

    if (result.violations.length > 20) {
      lines.push(
        chalk.dim(`  ... and ${result.violations.length - 20} more`)
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Render a brief summary line.
 */
export function renderSummary(result: ScanResult): string {
  const score = result.overallScore ?? 0;
  const violations = result.violations?.length ?? 0;
  const scoreColor =
    score >= 90 ? chalk.green : score >= 70 ? chalk.yellow : chalk.red;

  return `  Score: ${scoreColor(score + "/100")} | ${violations} issues found`;
}

/**
 * Render results as formatted JSON.
 */
export function renderJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Render results as an ASCII table.
 */
export function renderTable(result: ScanResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push("  Category          Score  Violations  Passed");
  lines.push("  " + "-".repeat(48));

  if (result.categories) {
    for (const cat of result.categories) {
      const name = cat.category.padEnd(18);
      const score = String(cat.score).padStart(5);
      const violations = String(cat.violations).padStart(10);
      const passed = String(cat.passed).padStart(7);
      lines.push(`  ${name}${score}${violations}${passed}`);
    }
  }

  lines.push("  " + "-".repeat(48));
  lines.push(
    `  ${"OVERALL".padEnd(18)}${String(result.overallScore ?? 0).padStart(5)}`
  );
  lines.push("");

  return lines.join("\n");
}
