import PDFDocument from "pdfkit";
import type {
  ScanResult,
  Violation,
  FixSuggestion,
  CategoryScore,
  Severity,
  CheckCategory,
} from "@preship/shared";

// ── Brand Colors ────────────────────────────────────────────────────────

const COLORS = {
  orange: "#F97316",
  darkBg: "#0A0A0A",
  white: "#FFFFFF",
  lightGray: "#E5E7EB",
  mediumGray: "#9CA3AF",
  darkGray: "#374151",
  sectionBg: "#F9FAFB",

  critical: "#DC2626",
  high: "#EA580C",
  medium: "#D97706",
  low: "#2563EB",
  info: "#6B7280",

  excellent: "#16A34A",
  good: "#22C55E",
  needsWork: "#EAB308",
  poor: "#DC2626",

  pass: "#16A34A",
  fail: "#DC2626",
} as const;

const FONTS = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  oblique: "Helvetica-Oblique",
  mono: "Courier",
  monoBold: "Courier-Bold",
} as const;

// ── Helpers ─────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 90) return COLORS.excellent;
  if (score >= 70) return COLORS.good;
  if (score >= 50) return COLORS.needsWork;
  return COLORS.poor;
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function getSeverityColor(severity: Severity): string {
  return COLORS[severity] ?? COLORS.info;
}

function getSeverityLabel(severity: Severity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

function getCategoryData(
  categories: CategoryScore[],
  cat: CheckCategory
): CategoryScore {
  return (
    categories.find((c) => c.category === cat) ?? {
      category: cat,
      score: 0,
      violations: 0,
      passed: 0,
    }
  );
}

function groupViolationsBySeverity(
  violations: Violation[]
): Map<Severity, Violation[]> {
  const order: Severity[] = ["critical", "high", "medium", "low", "info"];
  const grouped = new Map<Severity, Violation[]>();
  for (const sev of order) {
    const items = violations.filter((v) => v.severity === sev);
    if (items.length > 0) {
      grouped.set(sev, items);
    }
  }
  return grouped;
}

function countBySeverity(
  violations: Violation[],
  severity: Severity
): number {
  return violations.filter((v) => v.severity === severity).length;
}

// ── PDF Drawing Primitives ──────────────────────────────────────────────

const PAGE_MARGIN = 50;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const FOOTER_ZONE = PAGE_HEIGHT - 45;

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): boolean {
  if (doc.y + needed > FOOTER_ZONE) {
    doc.addPage();
    doc.y = PAGE_MARGIN;
    return true;
  }
  return false;
}

function drawScoreCircle(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  radius: number,
  score: number,
  options?: { fontSize?: number; showLabel?: boolean; label?: string }
): void {
  const color = getScoreColor(score);
  const fontSize = options?.fontSize ?? 28;

  doc.save();

  // Background circle
  doc.circle(x, y, radius).fill("#F3F4F6");

  // Track ring
  doc
    .save()
    .circle(x, y, radius - 4)
    .lineWidth(6)
    .strokeColor("#E5E7EB")
    .stroke()
    .restore();

  // Score arc
  if (score > 0) {
    doc.save();
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * score) / 100;
    const segments = Math.max(1, Math.floor(score / 2));
    doc.lineWidth(6).strokeColor(color);

    for (let i = 0; i < segments; i++) {
      const a1 = startAngle + (endAngle - startAngle) * (i / segments);
      const a2 = startAngle + (endAngle - startAngle) * ((i + 1) / segments);
      const x1 = x + (radius - 4) * Math.cos(a1);
      const y1 = y + (radius - 4) * Math.sin(a1);
      const x2 = x + (radius - 4) * Math.cos(a2);
      const y2 = y + (radius - 4) * Math.sin(a2);
      doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
    }
    doc.restore();
  }

  // Score number
  doc
    .font(FONTS.bold)
    .fontSize(fontSize)
    .fillColor(color)
    .text(String(score), x - radius, y - fontSize / 2 - 2, {
      width: radius * 2,
      align: "center",
    });

  if (options?.showLabel) {
    doc
      .font(FONTS.regular)
      .fontSize(9)
      .fillColor(COLORS.mediumGray)
      .text("/100", x - radius, y + fontSize / 2 - 4, {
        width: radius * 2,
        align: "center",
      });
  }

  doc.restore();

  // Category label below circle
  if (options?.label) {
    doc
      .font(FONTS.bold)
      .fontSize(9)
      .fillColor(COLORS.darkGray)
      .text(options.label, x - radius - 10, y + radius + 6, {
        width: radius * 2 + 20,
        align: "center",
      });
  }
}

function drawSeverityBadge(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  severity: Severity
): { width: number; height: number } {
  const label = getSeverityLabel(severity);
  const color = getSeverityColor(severity);
  const paddingH = 8;
  const paddingV = 3;
  const fontSize = 8;

  doc.font(FONTS.bold).fontSize(fontSize);
  const textWidth = doc.widthOfString(label);
  const badgeWidth = textWidth + paddingH * 2;
  const badgeHeight = fontSize + paddingV * 2 + 2;

  doc.roundedRect(x, y, badgeWidth, badgeHeight, 3).fill(color);

  doc
    .font(FONTS.bold)
    .fontSize(fontSize)
    .fillColor(COLORS.white)
    .text(label, x + paddingH, y + paddingV + 1, {
      width: textWidth,
      align: "center",
    });

  return { width: badgeWidth, height: badgeHeight };
}

function drawSectionHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  yPos?: number
): void {
  const y = yPos ?? doc.y;
  doc
    .save()
    .rect(PAGE_MARGIN, y, CONTENT_WIDTH, 30)
    .fill(COLORS.darkBg);

  doc
    .font(FONTS.bold)
    .fontSize(13)
    .fillColor(COLORS.orange)
    .text(title, PAGE_MARGIN + 12, y + 8, {
      width: CONTENT_WIDTH - 24,
    })
    .restore();

  doc.y = y + 38;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  options?: { compact?: boolean }
): void {
  const rowHeight = options?.compact ? 18 : 22;
  const headerHeight = options?.compact ? 22 : 26;
  const fontSize = options?.compact ? 8 : 9;
  const startX = PAGE_MARGIN;

  ensureSpace(doc, headerHeight + rowHeight * Math.min(rows.length, 3) + 10);

  // Header row
  let xPos = startX;
  doc.save();
  doc
    .rect(startX, doc.y, CONTENT_WIDTH, headerHeight)
    .fill(COLORS.darkBg);

  for (let i = 0; i < headers.length; i++) {
    doc
      .font(FONTS.bold)
      .fontSize(fontSize)
      .fillColor(COLORS.white)
      .text(headers[i], xPos + 6, doc.y + (headerHeight - fontSize) / 2, {
        width: colWidths[i] - 12,
        align: i === 0 ? "left" : "center",
      });
    xPos += colWidths[i];
  }
  doc.restore();
  doc.y += headerHeight;

  // Data rows
  for (let r = 0; r < rows.length; r++) {
    ensureSpace(doc, rowHeight + 5);

    const rowY = doc.y;
    if (r % 2 === 0) {
      doc.save();
      doc
        .rect(startX, rowY, CONTENT_WIDTH, rowHeight)
        .fill(COLORS.sectionBg);
      doc.restore();
    }

    xPos = startX;
    for (let c = 0; c < rows[r].length; c++) {
      const val = rows[r][c];
      const cellColor =
        val === "PASS" || val === "Good"
          ? COLORS.pass
          : val === "FAIL" || val === "Poor" || val === "Needs Improvement"
            ? COLORS.fail
            : COLORS.darkBg;

      doc
        .font(c === 0 ? FONTS.bold : FONTS.regular)
        .fontSize(fontSize)
        .fillColor(cellColor)
        .text(val, xPos + 6, rowY + (rowHeight - fontSize) / 2, {
          width: colWidths[c] - 12,
          align: c === 0 ? "left" : "center",
        });
      xPos += colWidths[c];
    }

    doc.y = rowY + rowHeight;
  }

  doc.y += 6;
}

function drawCodeBlock(
  doc: PDFKit.PDFDocument,
  code: string,
  x: number,
  width: number
): void {
  const truncated = truncate(code, 300);
  doc.font(FONTS.mono).fontSize(7);
  const textHeight = doc.heightOfString(truncated, { width: width - 16 });
  const blockHeight = textHeight + 10;

  ensureSpace(doc, blockHeight + 5);

  doc.save();
  doc
    .roundedRect(x, doc.y, width, blockHeight, 3)
    .fill("#1F2937");

  doc
    .font(FONTS.mono)
    .fontSize(7)
    .fillColor("#D1D5DB")
    .text(truncated, x + 8, doc.y + 5, {
      width: width - 16,
    });
  doc.restore();

  doc.y += blockHeight + 4;
}

function drawComplianceBadge(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  label: string,
  pass: boolean,
  width: number
): void {
  const bgColor = pass ? "#DCFCE7" : "#FEE2E2";
  const textColor = pass ? "#166534" : "#991B1B";
  const statusText = pass ? "PASS" : "FAIL";
  const height = 32;

  doc.save();
  doc.roundedRect(x, y, width, height, 4).fill(bgColor);

  doc
    .font(FONTS.bold)
    .fontSize(8)
    .fillColor(textColor)
    .text(label, x + 8, y + 5, { width: width - 16 });

  doc
    .font(FONTS.bold)
    .fontSize(12)
    .fillColor(textColor)
    .text(statusText, x + 8, y + 16, { width: width - 16 });

  doc.restore();
}

// ── Page Number Tracking ────────────────────────────────────────────────

/**
 * We use bufferPages mode and draw all footers at the end,
 * so we don't need to track page numbers manually.
 */
function drawAllFooters(doc: PDFKit.PDFDocument): void {
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc
      .save()
      .font(FONTS.regular)
      .fontSize(8)
      .fillColor(COLORS.mediumGray)
      .text("PreShip Quality Report", PAGE_MARGIN, FOOTER_ZONE + 8, {
        width: CONTENT_WIDTH / 2,
        align: "left",
      })
      .text(
        `Page ${i + 1} of ${pageCount}`,
        PAGE_MARGIN + CONTENT_WIDTH / 2,
        FOOTER_ZONE + 8,
        {
          width: CONTENT_WIDTH / 2,
          align: "right",
        }
      )
      .restore();
  }
}

// ── Page Builders ───────────────────────────────────────────────────────

function buildCoverPage(doc: PDFKit.PDFDocument, result: ScanResult): void {
  // Full dark background
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COLORS.darkBg);

  // Logo bar
  const logoX = PAGE_WIDTH / 2 - 80;
  const logoY = 80;
  doc.roundedRect(logoX, logoY, 160, 44, 8).fill(COLORS.orange);
  doc
    .font(FONTS.bold)
    .fontSize(22)
    .fillColor(COLORS.white)
    .text("PreShip", logoX, logoY + 12, { width: 160, align: "center" });

  // Title
  doc
    .font(FONTS.bold)
    .fontSize(32)
    .fillColor(COLORS.white)
    .text("Quality Report", PAGE_MARGIN, 160, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  // URL
  doc
    .font(FONTS.regular)
    .fontSize(14)
    .fillColor(COLORS.orange)
    .text(result.url, PAGE_MARGIN, 210, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  // ── Large score circle ──
  const circleY = 340;
  drawScoreCircle(doc, PAGE_WIDTH / 2, circleY, 80, result.overallScore, {
    fontSize: 44,
    showLabel: true,
  });

  // Score label
  const scoreColor = getScoreColor(result.overallScore);
  doc
    .font(FONTS.bold)
    .fontSize(18)
    .fillColor(scoreColor)
    .text(getScoreLabel(result.overallScore), PAGE_MARGIN, circleY + 90, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.mediumGray)
    .text("Overall Quality Score", PAGE_MARGIN, circleY + 112, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  // ── Severity summary bar ──
  const barY = circleY + 145;
  const critical = countBySeverity(result.violations, "critical");
  const high = countBySeverity(result.violations, "high");
  const medium = countBySeverity(result.violations, "medium");
  const low = countBySeverity(result.violations, "low");

  const items = [
    { count: critical, label: "Critical", color: COLORS.critical },
    { count: high, label: "High", color: COLORS.high },
    { count: medium, label: "Medium", color: COLORS.medium },
    { count: low, label: "Low", color: COLORS.low },
  ];

  const barWidth = 380;
  const barStartX = (PAGE_WIDTH - barWidth) / 2;
  const segW = barWidth / items.length;

  // Background bar
  doc
    .roundedRect(barStartX, barY, barWidth, 36, 6)
    .fill("#1A1A2E");

  for (let i = 0; i < items.length; i++) {
    const ix = barStartX + i * segW;

    // Colored dot
    doc.circle(ix + 14, barY + 18, 5).fill(items[i].color);

    doc
      .font(FONTS.bold)
      .fontSize(12)
      .fillColor(COLORS.white)
      .text(String(items[i].count), ix + 22, barY + 6, { width: segW - 26 });

    doc
      .font(FONTS.regular)
      .fontSize(7)
      .fillColor(COLORS.mediumGray)
      .text(items[i].label, ix + 22, barY + 21, { width: segW - 26 });
  }

  // ── Scan metadata ──
  const metaY = barY + 56;
  const metaItems = [
    { label: "Scanned", value: formatDate(result.createdAt) },
    { label: "Duration", value: `${(result.duration / 1000).toFixed(1)}s` },
    { label: "Pages", value: String(result.pagesScanned) },
  ];

  doc
    .font(FONTS.regular)
    .fontSize(9)
    .fillColor(COLORS.mediumGray);

  const metaStr = metaItems.map((m) => `${m.label}: ${m.value}`).join("   \u2022   ");
  doc.text(metaStr, PAGE_MARGIN, metaY, {
    width: CONTENT_WIDTH,
    align: "center",
  });

  // Footer branding
  doc
    .font(FONTS.regular)
    .fontSize(9)
    .fillColor(COLORS.mediumGray)
    .text(
      "Generated by PreShip \u2014 preship.dev",
      PAGE_MARGIN,
      PAGE_HEIGHT - 50,
      { width: CONTENT_WIDTH, align: "center" }
    );
}

function buildSummaryPage(
  doc: PDFKit.PDFDocument,
  result: ScanResult
): void {
  doc.addPage();

  drawSectionHeader(doc, "Executive Summary");

  // ── Category score circles in a row ──
  const categories: { label: string; cat: CheckCategory }[] = [
    { label: "Accessibility", cat: "accessibility" },
    { label: "Security", cat: "security" },
    { label: "Performance", cat: "performance" },
  ];

  const circleSpacing = CONTENT_WIDTH / 3;
  const circleBaseX = PAGE_MARGIN + circleSpacing / 2;
  const circleY = doc.y + 38;

  for (let i = 0; i < categories.length; i++) {
    const catData = getCategoryData(result.categories, categories[i].cat);
    drawScoreCircle(
      doc,
      circleBaseX + i * circleSpacing,
      circleY,
      32,
      catData.score,
      { fontSize: 20, showLabel: false, label: categories[i].label }
    );
  }

  doc.y = circleY + 56;

  // ── Key statistics compact table ──
  doc.y += 10;

  const totalViolations = result.violations.length;
  const criticalIssues = countBySeverity(result.violations, "critical");
  const autoFixable = result.suggestions.filter(
    (s) => s.confidence >= 0.8
  ).length;

  const statsRows = [
    ["Total Violations", String(totalViolations)],
    ["Critical Issues", String(criticalIssues)],
    ["Auto-Fixable", String(autoFixable)],
    ["Pages Scanned", String(result.pagesScanned)],
    ["Scan Duration", `${(result.duration / 1000).toFixed(1)}s`],
  ];

  drawTable(
    doc,
    ["Metric", "Value"],
    statsRows,
    [CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4],
    { compact: true }
  );

  doc.y += 6;

  // ── Compliance badges row ──
  const a11yViolations = result.violations.filter(
    (v) => v.category === "accessibility"
  );
  const criticalA11y = a11yViolations.filter(
    (v) => v.severity === "critical"
  ).length;
  const wcagPass = criticalA11y === 0;

  const secViolations = result.violations.filter(
    (v) => v.category === "security"
  );
  const criticalSec = secViolations.filter(
    (v) => v.severity === "critical"
  ).length;
  const owaspPass = criticalSec === 0;

  const perfData = getCategoryData(result.categories, "performance");
  const cwvPass = perfData.score >= 70;

  const badgeW = (CONTENT_WIDTH - 16) / 3;
  const badgeY = doc.y;

  drawComplianceBadge(doc, PAGE_MARGIN, badgeY, "WCAG 2.1 AA", wcagPass, badgeW);
  drawComplianceBadge(
    doc,
    PAGE_MARGIN + badgeW + 8,
    badgeY,
    "Security (OWASP)",
    owaspPass,
    badgeW
  );
  drawComplianceBadge(
    doc,
    PAGE_MARGIN + (badgeW + 8) * 2,
    badgeY,
    "Core Web Vitals",
    cwvPass,
    badgeW
  );

  doc.y = badgeY + 42;

  // ── Per-category one-liner if no violations ──
  doc.y += 8;
  for (const cat of categories) {
    const catViolations = result.violations.filter(
      (v) => v.category === cat.cat
    );
    if (catViolations.length === 0) {
      doc
        .font(FONTS.regular)
        .fontSize(9)
        .fillColor(COLORS.pass)
        .text(
          `\u2713  ${cat.label}: No issues found`,
          PAGE_MARGIN,
          doc.y,
          { width: CONTENT_WIDTH }
        );
      doc.y += 4;
    }
  }

  // ── Disclaimer (compact) ──
  doc.y += 12;

  doc.save();
  const disclaimerH = 36;
  doc
    .roundedRect(PAGE_MARGIN, doc.y, CONTENT_WIDTH, disclaimerH, 4)
    .fill("#FEF3C7");

  doc
    .font(FONTS.bold)
    .fontSize(7)
    .fillColor("#92400E")
    .text("Disclaimer:", PAGE_MARGIN + 8, doc.y + 6, {
      continued: true,
      width: CONTENT_WIDTH - 16,
    })
    .font(FONTS.regular)
    .text(
      " This automated scan covers approximately 57% of WCAG issues. Manual testing is recommended for full compliance. This report does not constitute legal advice."
    );
  doc.restore();

  doc.y += disclaimerH + 4;
}

function buildViolationsSection(
  doc: PDFKit.PDFDocument,
  title: string,
  category: CheckCategory,
  result: ScanResult
): void {
  const violations = result.violations.filter(
    (v) => v.category === category
  );

  // Skip the entire section if there are no violations
  if (violations.length === 0) {
    return;
  }

  // Only add page if less than 200px remaining
  ensureSpace(doc, 200);

  const catData = getCategoryData(result.categories, category);
  drawSectionHeader(doc, title);

  // Compact score summary line
  const scoreColor = getScoreColor(catData.score);
  doc
    .font(FONTS.bold)
    .fontSize(10)
    .fillColor(scoreColor)
    .text(`Score: ${catData.score}/100`, PAGE_MARGIN, doc.y, {
      continued: true,
    })
    .font(FONTS.regular)
    .fillColor(COLORS.darkGray)
    .text(
      `   \u2022  ${catData.passed} passed   \u2022  ${catData.violations} violations`
    );

  doc.y += 8;

  // Group violations by severity
  const grouped = groupViolationsBySeverity(violations);

  for (const [severity, items] of grouped) {
    ensureSpace(doc, 50);

    // Severity group header
    doc
      .font(FONTS.bold)
      .fontSize(10)
      .fillColor(getSeverityColor(severity))
      .text(
        `${getSeverityLabel(severity)} (${items.length})`,
        PAGE_MARGIN,
        doc.y
      );
    doc.y += 4;

    for (const violation of items) {
      ensureSpace(doc, 60);

      const cardStartY = doc.y;
      const cardX = PAGE_MARGIN + 4;
      const textX = cardX + 10;
      const textW = CONTENT_WIDTH - 18;

      // Severity badge + rule
      drawSeverityBadge(doc, textX, cardStartY, severity);

      if (violation.rule) {
        doc
          .font(FONTS.mono)
          .fontSize(7)
          .fillColor(COLORS.mediumGray)
          .text(
            truncate(violation.rule, 60),
            textX + 65,
            cardStartY + 3,
            { width: textW - 70 }
          );
      }

      doc.y = cardStartY + 18;

      // Message
      doc
        .font(FONTS.regular)
        .fontSize(9)
        .fillColor(COLORS.darkBg)
        .text(violation.message, textX, doc.y, { width: textW });
      doc.y += 3;

      // Affected element (compact)
      if (violation.element) {
        doc
          .font(FONTS.bold)
          .fontSize(7)
          .fillColor(COLORS.darkGray)
          .text("Element:", textX, doc.y);
        doc.y += 1;
        drawCodeBlock(doc, truncate(violation.element, 200), textX, textW);
      }

      // Fix suggestion inline
      const suggestion = result.suggestions.find(
        (s) => s.violationId === violation.id
      );
      if (suggestion) {
        ensureSpace(doc, 40);
        doc
          .font(FONTS.bold)
          .fontSize(7)
          .fillColor(COLORS.pass)
          .text("Fix:", textX, doc.y);
        doc.y += 1;
        doc
          .font(FONTS.regular)
          .fontSize(8)
          .fillColor(COLORS.darkGray)
          .text(suggestion.description, textX + 4, doc.y, {
            width: textW - 8,
          });
        doc.y += 2;

        if (suggestion.codeSnippet) {
          drawCodeBlock(doc, suggestion.codeSnippet, textX, textW);
        }
      }

      // Draw colored left accent bar
      const cardEndY = doc.y;
      doc
        .save()
        .rect(cardX, cardStartY, 3, cardEndY - cardStartY)
        .fill(getSeverityColor(severity))
        .restore();

      doc.y += 6;

      // Thin separator between violations
      doc
        .save()
        .moveTo(PAGE_MARGIN + 12, doc.y)
        .lineTo(PAGE_WIDTH - PAGE_MARGIN, doc.y)
        .lineWidth(0.3)
        .strokeColor(COLORS.lightGray)
        .stroke()
        .restore();
      doc.y += 6;
    }

    doc.y += 4;
  }
}

function buildPerformanceSection(
  doc: PDFKit.PDFDocument,
  result: ScanResult
): void {
  const catData = getCategoryData(result.categories, "performance");
  const violations = result.violations.filter(
    (v) => v.category === "performance"
  );

  // Skip if no performance data at all
  if (catData.score === 0 && catData.passed === 0 && violations.length === 0) {
    return;
  }

  ensureSpace(doc, 200);
  drawSectionHeader(doc, "Performance Analysis");

  // Score line
  const scoreColor = getScoreColor(catData.score);
  doc
    .font(FONTS.bold)
    .fontSize(10)
    .fillColor(scoreColor)
    .text(`Score: ${catData.score}/100`, PAGE_MARGIN, doc.y, {
      continued: true,
    })
    .font(FONTS.regular)
    .fillColor(COLORS.darkGray)
    .text(
      `   \u2022  ${catData.passed} passed   \u2022  ${catData.violations} issues`
    );

  doc.y += 10;

  // Core Web Vitals table
  const cwvMetrics = [
    { name: "Largest Contentful Paint (LCP)", rule: "lcp", good: "\u2264 2.5s" },
    { name: "First Input Delay (FID)", rule: "fid", good: "\u2264 100ms" },
    { name: "Cumulative Layout Shift (CLS)", rule: "cls", good: "\u2264 0.1" },
    { name: "First Contentful Paint (FCP)", rule: "fcp", good: "\u2264 1.8s" },
    { name: "Time to Interactive (TTI)", rule: "tti", good: "\u2264 3.8s" },
    { name: "Total Blocking Time (TBT)", rule: "tbt", good: "\u2264 200ms" },
  ];

  const cwvRows: string[][] = cwvMetrics.map((metric) => {
    const violation = violations.find((v) =>
      v.rule.toLowerCase().includes(metric.rule)
    );
    if (violation) {
      const status =
        violation.severity === "critical" || violation.severity === "high"
          ? "FAIL"
          : "Needs Improvement";
      return [metric.name, violation.message || "N/A", status];
    }
    return [metric.name, metric.good, "PASS"];
  });

  drawTable(
    doc,
    ["Metric", "Threshold", "Status"],
    cwvRows,
    [CONTENT_WIDTH * 0.45, CONTENT_WIDTH * 0.3, CONTENT_WIDTH * 0.25],
    { compact: true }
  );

  // Performance issues (if any)
  if (violations.length > 0) {
    doc.y += 4;

    doc
      .font(FONTS.bold)
      .fontSize(10)
      .fillColor(COLORS.darkBg)
      .text("Performance Issues", PAGE_MARGIN, doc.y);
    doc.y += 6;

    const grouped = groupViolationsBySeverity(violations);

    for (const [severity, items] of grouped) {
      for (const violation of items) {
        ensureSpace(doc, 40);

        const rowY = doc.y;
        drawSeverityBadge(doc, PAGE_MARGIN, rowY, severity);

        doc
          .font(FONTS.regular)
          .fontSize(8)
          .fillColor(COLORS.darkBg)
          .text(violation.message, PAGE_MARGIN + 65, rowY + 2, {
            width: CONTENT_WIDTH - 70,
          });

        doc.y = rowY + 18;

        const suggestion = result.suggestions.find(
          (s) => s.violationId === violation.id
        );
        if (suggestion) {
          doc
            .font(FONTS.oblique)
            .fontSize(7.5)
            .fillColor(COLORS.darkGray)
            .text(
              `\u2192 ${suggestion.description}`,
              PAGE_MARGIN + 8,
              doc.y,
              { width: CONTENT_WIDTH - 16 }
            );
          doc.y += 4;
        }

        doc.y += 4;
      }
    }
  }
}

function buildRecommendationsSection(
  doc: PDFKit.PDFDocument,
  result: ScanResult
): void {
  const hasViolations = result.violations.length > 0;

  // If no violations, we'll just add a compact section to the current page
  // rather than a whole new page
  if (!hasViolations) {
    // Check if we have enough space on the current page, otherwise add one
    if (doc.y > FOOTER_ZONE - 160) {
      doc.addPage();
    }

    drawSectionHeader(doc, "Summary");

    doc
      .font(FONTS.regular)
      .fontSize(10)
      .fillColor(COLORS.pass)
      .text(
        "\u2713  No issues found. Your site is in great shape!",
        PAGE_MARGIN,
        doc.y,
        { width: CONTENT_WIDTH }
      );
    doc.y += 16;

    doc
      .font(FONTS.bold)
      .fontSize(10)
      .fillColor(COLORS.darkBg)
      .text("Next Steps", PAGE_MARGIN, doc.y);
    doc.y += 6;

    const steps = [
      "Schedule periodic scans for ongoing quality monitoring.",
      "Supplement automated scanning with manual accessibility testing.",
      "Re-scan after any major site updates.",
    ];

    for (const step of steps) {
      doc
        .font(FONTS.regular)
        .fontSize(9)
        .fillColor(COLORS.darkGray)
        .text(`\u2022  ${step}`, PAGE_MARGIN + 8, doc.y, {
          width: CONTENT_WIDTH - 16,
        });
      doc.y += 3;
    }

    doc.y += 10;

    // Branding
    doc
      .font(FONTS.regular)
      .fontSize(8)
      .fillColor(COLORS.mediumGray)
      .text(
        "This report was generated by PreShip. For continuous monitoring, visit preship.dev",
        PAGE_MARGIN,
        doc.y,
        { width: CONTENT_WIDTH, align: "center" }
      );

    return;
  }

  // Has violations: recommendations section
  ensureSpace(doc, 200);
  drawSectionHeader(doc, "Recommendations & Next Steps");

  // Top 5 highest-impact fixes
  doc
    .font(FONTS.bold)
    .fontSize(11)
    .fillColor(COLORS.darkBg)
    .text("Top Fixes by Impact", PAGE_MARGIN, doc.y);
  doc.y += 6;

  const severityOrder: Record<Severity, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  };

  const sortedViolations = [...result.violations]
    .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
    .slice(0, 5);

  for (let i = 0; i < sortedViolations.length; i++) {
    const v = sortedViolations[i];
    const suggestion = result.suggestions.find(
      (s) => s.violationId === v.id
    );

    ensureSpace(doc, 40);

    const rowY = doc.y;

    // Number badge
    const numX = PAGE_MARGIN + 10;
    doc.circle(numX, rowY + 7, 8).fill(COLORS.orange);
    doc
      .font(FONTS.bold)
      .fontSize(9)
      .fillColor(COLORS.white)
      .text(String(i + 1), numX - 8, rowY + 3, {
        width: 16,
        align: "center",
      });

    // Severity + message
    const textX = PAGE_MARGIN + 26;
    drawSeverityBadge(doc, textX, rowY, v.severity);

    doc
      .font(FONTS.regular)
      .fontSize(8)
      .fillColor(COLORS.darkBg)
      .text(truncate(v.message, 120), textX, rowY + 16, {
        width: CONTENT_WIDTH - 32,
      });

    doc.y = rowY + 28;

    if (suggestion) {
      doc
        .font(FONTS.oblique)
        .fontSize(7.5)
        .fillColor(COLORS.darkGray)
        .text(
          `\u2192 ${truncate(suggestion.description, 140)}`,
          textX + 4,
          doc.y,
          { width: CONTENT_WIDTH - 38 }
        );
      doc.y += 4;
    }

    doc.y += 6;
  }

  doc.y += 6;

  // Next steps
  doc
    .font(FONTS.bold)
    .fontSize(10)
    .fillColor(COLORS.darkBg)
    .text("Next Steps", PAGE_MARGIN, doc.y);
  doc.y += 6;

  const nextSteps = [
    "Address critical and high-severity violations first for maximum impact.",
    "Use auto-fix suggestions where available to speed up remediation.",
    "Re-scan after applying fixes to verify improvements.",
    "Schedule periodic scans for ongoing compliance monitoring.",
    "Supplement automated scanning with manual accessibility testing.",
  ];

  for (const step of nextSteps) {
    ensureSpace(doc, 16);
    doc
      .font(FONTS.regular)
      .fontSize(9)
      .fillColor(COLORS.darkGray)
      .text(`\u2022  ${step}`, PAGE_MARGIN + 8, doc.y, {
        width: CONTENT_WIDTH - 16,
      });
    doc.y += 3;
  }

  doc.y += 14;

  // Branding
  doc
    .font(FONTS.regular)
    .fontSize(8)
    .fillColor(COLORS.mediumGray)
    .text(
      "This report was generated by PreShip. For continuous monitoring, visit preship.dev",
      PAGE_MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, align: "center" }
    );
}

// ── Public API ──────────────────────────────────────────────────────────

export async function generatePdfReport(
  scanResult: ScanResult
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: "letter",
      margins: {
        top: PAGE_MARGIN,
        bottom: PAGE_MARGIN,
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
      },
      info: {
        Title: `PreShip Quality Report - ${scanResult.url}`,
        Author: "PreShip",
        Subject: "Quality Report",
        Creator: "PreShip (preship.dev)",
        Producer: "PDFKit",
      },
      autoFirstPage: false,
      bufferPages: true,
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    // Page 1: Cover (always)
    doc.addPage();
    buildCoverPage(doc, scanResult);

    // Page 2: Executive Summary (always)
    buildSummaryPage(doc, scanResult);

    // Violations sections: only added if violations exist in that category
    buildViolationsSection(
      doc,
      "Accessibility Audit (WCAG 2.1 Level AA)",
      "accessibility",
      scanResult
    );

    buildViolationsSection(
      doc,
      "Security Assessment",
      "security",
      scanResult
    );

    // Performance: only if data exists
    buildPerformanceSection(doc, scanResult);

    // Recommendations: adapts based on whether violations exist
    buildRecommendationsSection(doc, scanResult);

    // Draw footers on all pages at once
    drawAllFooters(doc);

    doc.end();
  });
}
