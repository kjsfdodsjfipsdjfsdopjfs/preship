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

  // Severity colors
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#D97706",
  low: "#2563EB",
  info: "#6B7280",

  // Score colors
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

// ── PDF Drawing Primitives ──────────────────────────────────────────────

const PAGE_MARGIN = 50;
const PAGE_WIDTH = 612; // Letter
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > PAGE_HEIGHT - PAGE_MARGIN - 30) {
    doc.addPage();
    doc.y = PAGE_MARGIN;
  }
}

function drawPageFooter(doc: PDFKit.PDFDocument, pageNum: number): void {
  const footerY = PAGE_HEIGHT - 35;
  doc
    .save()
    .font(FONTS.regular)
    .fontSize(8)
    .fillColor(COLORS.mediumGray)
    .text("PreShip Compliance Report", PAGE_MARGIN, footerY, {
      width: CONTENT_WIDTH / 2,
      align: "left",
    })
    .text(`Page ${pageNum}`, PAGE_MARGIN + CONTENT_WIDTH / 2, footerY, {
      width: CONTENT_WIDTH / 2,
      align: "right",
    })
    .restore();
}

function drawScoreCircle(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  radius: number,
  score: number,
  options?: { fontSize?: number; showLabel?: boolean }
): void {
  const color = getScoreColor(score);
  const fontSize = options?.fontSize ?? 28;

  // Background circle
  doc.save();
  doc.circle(x, y, radius).fill("#F3F4F6");

  // Score arc (draw as a filled arc segment)
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (2 * Math.PI * score) / 100;

  // Draw arc using stroke
  doc
    .save()
    .circle(x, y, radius - 4)
    .lineWidth(6)
    .strokeColor("#E5E7EB")
    .stroke()
    .restore();

  // Draw the score arc
  if (score > 0) {
    doc.save();
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

  // Score text
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

  // Badge background
  doc
    .roundedRect(x, y, badgeWidth, badgeHeight, 3)
    .fill(color);

  // Badge text
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
    .rect(PAGE_MARGIN, y, CONTENT_WIDTH, 32)
    .fill(COLORS.darkBg);

  doc
    .font(FONTS.bold)
    .fontSize(14)
    .fillColor(COLORS.orange)
    .text(title, PAGE_MARGIN + 12, y + 9, {
      width: CONTENT_WIDTH - 24,
    })
    .restore();

  doc.y = y + 42;
}

function drawHorizontalRule(doc: PDFKit.PDFDocument): void {
  doc
    .save()
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, doc.y)
    .lineWidth(0.5)
    .strokeColor(COLORS.lightGray)
    .stroke()
    .restore();
  doc.y += 8;
}

function drawKeyValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  options?: { valueColor?: string; x?: number; width?: number }
): void {
  const x = options?.x ?? PAGE_MARGIN;
  const width = options?.width ?? CONTENT_WIDTH;

  doc
    .font(FONTS.bold)
    .fontSize(10)
    .fillColor(COLORS.darkGray)
    .text(label, x, doc.y, { continued: true, width })
    .font(FONTS.regular)
    .fillColor(options?.valueColor ?? COLORS.darkBg)
    .text(`  ${value}`, { width });
}

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  colWidths: number[]
): void {
  const rowHeight = 22;
  const headerHeight = 26;
  const startX = PAGE_MARGIN;

  ensureSpace(doc, headerHeight + rowHeight * rows.length + 10);

  // Header row
  let xPos = startX;
  doc.save();
  doc
    .rect(startX, doc.y, CONTENT_WIDTH, headerHeight)
    .fill(COLORS.darkBg);

  for (let i = 0; i < headers.length; i++) {
    doc
      .font(FONTS.bold)
      .fontSize(9)
      .fillColor(COLORS.white)
      .text(headers[i], xPos + 6, doc.y + 7, {
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
      const cellColor =
        rows[r][c] === "PASS" || rows[r][c] === "Good"
          ? COLORS.pass
          : rows[r][c] === "FAIL" ||
            rows[r][c] === "Poor" ||
            rows[r][c] === "Needs Improvement"
          ? COLORS.fail
          : COLORS.darkBg;

      doc
        .font(c === 0 ? FONTS.bold : FONTS.regular)
        .fontSize(9)
        .fillColor(cellColor)
        .text(rows[r][c], xPos + 6, rowY + 6, {
          width: colWidths[c] - 12,
          align: c === 0 ? "left" : "center",
        });
      xPos += colWidths[c];
    }

    doc.y = rowY + rowHeight;
  }

  doc.y += 8;
}

function drawCodeBlock(
  doc: PDFKit.PDFDocument,
  code: string,
  x: number,
  width: number
): void {
  const truncated = truncate(code, 300);
  doc.font(FONTS.mono).fontSize(7.5);
  const textHeight = doc.heightOfString(truncated, { width: width - 16 });
  const blockHeight = textHeight + 12;

  ensureSpace(doc, blockHeight + 5);

  doc.save();
  doc
    .roundedRect(x, doc.y, width, blockHeight, 3)
    .fill("#1F2937");

  doc
    .font(FONTS.mono)
    .fontSize(7.5)
    .fillColor("#D1D5DB")
    .text(truncated, x + 8, doc.y + 6, {
      width: width - 16,
    });
  doc.restore();

  doc.y += blockHeight + 6;
}

// ── Page Builders ───────────────────────────────────────────────────────

function buildCoverPage(doc: PDFKit.PDFDocument, result: ScanResult): void {
  // Dark background
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COLORS.darkBg);

  // Logo placeholder (orange rectangle with text)
  const logoX = PAGE_WIDTH / 2 - 90;
  const logoY = 120;
  doc
    .roundedRect(logoX, logoY, 180, 50, 8)
    .fill(COLORS.orange);
  doc
    .font(FONTS.bold)
    .fontSize(22)
    .fillColor(COLORS.white)
    .text("PreShip", logoX, logoY + 14, {
      width: 180,
      align: "center",
    });

  // Title
  doc
    .font(FONTS.bold)
    .fontSize(28)
    .fillColor(COLORS.white)
    .text("Accessibility Compliance Report", PAGE_MARGIN, 220, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  // URL
  doc
    .font(FONTS.regular)
    .fontSize(14)
    .fillColor(COLORS.orange)
    .text(result.url, PAGE_MARGIN, 270, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  // Date
  doc
    .font(FONTS.regular)
    .fontSize(11)
    .fillColor(COLORS.mediumGray)
    .text(`Scanned on ${formatDate(result.createdAt)}`, PAGE_MARGIN, 300, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  // Overall score circle
  drawScoreCircle(doc, PAGE_WIDTH / 2, 430, 60, result.overallScore, {
    fontSize: 36,
    showLabel: true,
  });

  // Score label
  const scoreColor = getScoreColor(result.overallScore);
  doc
    .font(FONTS.bold)
    .fontSize(16)
    .fillColor(scoreColor)
    .text(getScoreLabel(result.overallScore), PAGE_MARGIN, 510, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.mediumGray)
    .text("Overall Compliance Score", PAGE_MARGIN, 532, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  // Footer branding
  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.mediumGray)
    .text(
      "Generated by PreShip \u2014 preship.dev",
      PAGE_MARGIN,
      PAGE_HEIGHT - 60,
      {
        width: CONTENT_WIDTH,
        align: "center",
      }
    );

  drawPageFooter(doc, 1);
}

function buildExecutiveSummary(
  doc: PDFKit.PDFDocument,
  result: ScanResult,
  pageNum: number
): void {
  doc.addPage();

  drawSectionHeader(doc, "Executive Summary");

  // Overall score section
  const summaryStartY = doc.y;

  doc
    .font(FONTS.bold)
    .fontSize(12)
    .fillColor(COLORS.darkBg)
    .text("Overall Score", PAGE_MARGIN, summaryStartY);
  doc.y = summaryStartY + 6;

  drawScoreCircle(doc, PAGE_MARGIN + 45, summaryStartY + 55, 35, result.overallScore, {
    fontSize: 22,
    showLabel: true,
  });

  const scoreColor = getScoreColor(result.overallScore);
  doc
    .font(FONTS.bold)
    .fontSize(11)
    .fillColor(scoreColor)
    .text(getScoreLabel(result.overallScore), PAGE_MARGIN, summaryStartY + 96, {
      width: 90,
      align: "center",
    });

  // Sub-scores (to the right of overall)
  const subsX = PAGE_MARGIN + 130;
  const categories: { label: string; cat: CheckCategory }[] = [
    { label: "Accessibility", cat: "accessibility" },
    { label: "Security", cat: "security" },
    { label: "Performance", cat: "performance" },
  ];

  for (let i = 0; i < categories.length; i++) {
    const catData = getCategoryData(result.categories, categories[i].cat);
    const cx = subsX + i * 130;
    const cy = summaryStartY + 16;

    doc
      .font(FONTS.bold)
      .fontSize(10)
      .fillColor(COLORS.darkGray)
      .text(categories[i].label, cx - 5, cy, {
        width: 110,
        align: "center",
      });

    drawScoreCircle(doc, cx + 50, cy + 45, 28, catData.score, {
      fontSize: 18,
      showLabel: false,
    });

    const catColor = getScoreColor(catData.score);
    doc
      .font(FONTS.regular)
      .fontSize(9)
      .fillColor(catColor)
      .text(getScoreLabel(catData.score), cx - 5, cy + 78, {
        width: 110,
        align: "center",
      });
  }

  doc.y = summaryStartY + 130;
  drawHorizontalRule(doc);

  // Key statistics
  doc
    .font(FONTS.bold)
    .fontSize(12)
    .fillColor(COLORS.darkBg)
    .text("Key Statistics", PAGE_MARGIN, doc.y);
  doc.y += 4;

  const totalViolations = result.violations.length;
  const criticalIssues = result.violations.filter(
    (v) => v.severity === "critical"
  ).length;
  const autoFixable = result.suggestions.filter(
    (s) => s.confidence >= 0.8
  ).length;

  const stats = [
    ["Total Violations", String(totalViolations)],
    ["Critical Issues", String(criticalIssues)],
    ["Auto-Fixable Issues", String(autoFixable)],
    ["Pages Scanned", String(result.pagesScanned)],
    [
      "Scan Duration",
      `${(result.duration / 1000).toFixed(1)}s`,
    ],
  ];

  drawTable(
    doc,
    ["Metric", "Value"],
    stats,
    [CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4]
  );

  doc.y += 4;
  drawHorizontalRule(doc);

  // Compliance status
  doc
    .font(FONTS.bold)
    .fontSize(12)
    .fillColor(COLORS.darkBg)
    .text("Compliance Status", PAGE_MARGIN, doc.y);
  doc.y += 8;

  const a11yViolations = result.violations.filter(
    (v) => v.category === "accessibility"
  );
  const criticalA11y = a11yViolations.filter(
    (v) => v.severity === "critical"
  ).length;
  const wcagPass = criticalA11y === 0;

  const complianceColor = wcagPass ? COLORS.pass : COLORS.fail;
  const complianceStatus = wcagPass ? "PASS" : "FAIL";

  doc
    .font(FONTS.bold)
    .fontSize(11)
    .fillColor(complianceColor)
    .text(
      `WCAG 2.1 AA: ${complianceStatus}`,
      PAGE_MARGIN,
      doc.y
    );
  doc.y += 4;

  doc
    .font(FONTS.regular)
    .fontSize(9)
    .fillColor(COLORS.mediumGray)
    .text(
      wcagPass
        ? "No critical accessibility violations detected."
        : `${criticalA11y} critical accessibility violation(s) found. Remediation required.`,
      PAGE_MARGIN,
      doc.y,
      { width: CONTENT_WIDTH }
    );

  doc.y += 16;

  drawPageFooter(doc, pageNum);
}

function buildViolationsSection(
  doc: PDFKit.PDFDocument,
  title: string,
  category: CheckCategory,
  result: ScanResult,
  startPage: number
): number {
  doc.addPage();
  let currentPage = startPage;

  const catData = getCategoryData(result.categories, category);
  const violations = result.violations.filter(
    (v) => v.category === category
  );

  drawSectionHeader(doc, title);

  // Score summary row
  const scoreY = doc.y;
  drawScoreCircle(doc, PAGE_MARGIN + 30, scoreY + 20, 22, catData.score, {
    fontSize: 16,
    showLabel: false,
  });

  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.darkGray)
    .text(
      `Score: ${catData.score}/100  |  Passed: ${catData.passed}  |  Violations: ${catData.violations}`,
      PAGE_MARGIN + 65,
      scoreY + 14,
      { width: CONTENT_WIDTH - 70 }
    );

  doc.y = scoreY + 50;
  drawHorizontalRule(doc);

  if (violations.length === 0) {
    doc
      .font(FONTS.oblique)
      .fontSize(11)
      .fillColor(COLORS.pass)
      .text("No violations found. Great job!", PAGE_MARGIN, doc.y, {
        width: CONTENT_WIDTH,
      });
    doc.y += 20;
    drawPageFooter(doc, currentPage);
    return currentPage;
  }

  // Group violations by severity
  const grouped = groupViolationsBySeverity(violations);

  for (const [severity, items] of grouped) {
    ensureSpace(doc, 60);

    // Severity group header
    doc
      .font(FONTS.bold)
      .fontSize(11)
      .fillColor(getSeverityColor(severity))
      .text(
        `${getSeverityLabel(severity)} (${items.length})`,
        PAGE_MARGIN,
        doc.y
      );
    doc.y += 6;

    for (const violation of items) {
      ensureSpace(doc, 80);

      // Violation card
      const cardStartY = doc.y;
      const cardX = PAGE_MARGIN + 4;
      const cardWidth = CONTENT_WIDTH - 8;

      // Left accent bar
      doc
        .save()
        .rect(cardX, cardStartY, 3, 1) // placeholder height, we adjust later
        .fill(getSeverityColor(severity))
        .restore();

      const textX = cardX + 12;
      const textW = cardWidth - 20;

      // Severity badge
      drawSeverityBadge(doc, textX, cardStartY, severity);

      // Rule reference
      if (violation.help || violation.rule) {
        const ruleText = violation.help
          ? `${violation.rule} \u2014 ${violation.help}`
          : violation.rule;
        doc
          .font(FONTS.regular)
          .fontSize(8)
          .fillColor(COLORS.mediumGray)
          .text(truncate(ruleText, 80), textX + 70, cardStartY + 3, {
            width: textW - 75,
          });
      }

      doc.y = cardStartY + 20;

      // Description
      doc
        .font(FONTS.regular)
        .fontSize(9)
        .fillColor(COLORS.darkBg)
        .text(violation.message, textX, doc.y, { width: textW });
      doc.y += 4;

      // Affected element
      if (violation.element) {
        doc
          .font(FONTS.bold)
          .fontSize(8)
          .fillColor(COLORS.darkGray)
          .text("Affected Element:", textX, doc.y, { width: textW });
        doc.y += 2;

        drawCodeBlock(doc, truncate(violation.element, 200), textX, textW);
      }

      // Selector
      if (violation.selector) {
        doc
          .font(FONTS.bold)
          .fontSize(8)
          .fillColor(COLORS.darkGray)
          .text("CSS Selector:", textX, doc.y, { width: textW });
        doc.y += 2;

        drawCodeBlock(doc, violation.selector, textX, textW);
      }

      // Recommended fix (from suggestions)
      const suggestion = result.suggestions.find(
        (s) => s.violationId === violation.id
      );
      if (suggestion) {
        ensureSpace(doc, 50);
        doc
          .font(FONTS.bold)
          .fontSize(8)
          .fillColor(COLORS.pass)
          .text("Recommended Fix:", textX, doc.y, { width: textW });
        doc.y += 2;

        doc
          .font(FONTS.regular)
          .fontSize(8.5)
          .fillColor(COLORS.darkGray)
          .text(suggestion.description, textX, doc.y, { width: textW });
        doc.y += 2;

        if (suggestion.codeSnippet) {
          drawCodeBlock(doc, suggestion.codeSnippet, textX, textW);
        }
      }

      // Draw the left accent bar with correct height
      const cardEndY = doc.y;
      doc
        .save()
        .rect(cardX, cardStartY, 3, cardEndY - cardStartY)
        .fill(getSeverityColor(severity))
        .restore();

      doc.y += 8;
      drawHorizontalRule(doc);

      // Check if we need a new page
      if (doc.y > PAGE_HEIGHT - PAGE_MARGIN - 40) {
        drawPageFooter(doc, currentPage);
        doc.addPage();
        currentPage++;
        doc.y = PAGE_MARGIN;
      }
    }

    doc.y += 6;
  }

  drawPageFooter(doc, currentPage);
  return currentPage;
}

function buildPerformanceSection(
  doc: PDFKit.PDFDocument,
  result: ScanResult,
  startPage: number
): number {
  doc.addPage();
  let currentPage = startPage;

  const catData = getCategoryData(result.categories, "performance");
  const violations = result.violations.filter(
    (v) => v.category === "performance"
  );

  drawSectionHeader(doc, "Performance Analysis");

  // Score summary
  const scoreY = doc.y;
  drawScoreCircle(doc, PAGE_MARGIN + 30, scoreY + 20, 22, catData.score, {
    fontSize: 16,
    showLabel: false,
  });

  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.darkGray)
    .text(
      `Score: ${catData.score}/100  |  Passed: ${catData.passed}  |  Issues: ${catData.violations}`,
      PAGE_MARGIN + 65,
      scoreY + 14,
      { width: CONTENT_WIDTH - 70 }
    );

  doc.y = scoreY + 50;
  drawHorizontalRule(doc);

  // Core Web Vitals table (extracted from violations if available)
  doc
    .font(FONTS.bold)
    .fontSize(11)
    .fillColor(COLORS.darkBg)
    .text("Core Web Vitals", PAGE_MARGIN, doc.y);
  doc.y += 8;

  // Build CWV rows from known performance violation rules
  const cwvMetrics: { name: string; rule: string; good: string }[] = [
    {
      name: "Largest Contentful Paint (LCP)",
      rule: "lcp",
      good: "\u2264 2.5s",
    },
    { name: "First Input Delay (FID)", rule: "fid", good: "\u2264 100ms" },
    {
      name: "Cumulative Layout Shift (CLS)",
      rule: "cls",
      good: "\u2264 0.1",
    },
    {
      name: "First Contentful Paint (FCP)",
      rule: "fcp",
      good: "\u2264 1.8s",
    },
    {
      name: "Time to Interactive (TTI)",
      rule: "tti",
      good: "\u2264 3.8s",
    },
    {
      name: "Total Blocking Time (TBT)",
      rule: "tbt",
      good: "\u2264 200ms",
    },
  ];

  const cwvRows: string[][] = cwvMetrics.map((metric) => {
    const violation = violations.find(
      (v) => v.rule.toLowerCase().includes(metric.rule)
    );
    if (violation) {
      const status =
        violation.severity === "critical" || violation.severity === "high"
          ? "Needs Improvement"
          : violation.severity === "medium"
          ? "Fair"
          : "Good";
      return [metric.name, violation.message || "N/A", status];
    }
    return [metric.name, metric.good, "Good"];
  });

  drawTable(
    doc,
    ["Metric", "Value", "Status"],
    cwvRows,
    [CONTENT_WIDTH * 0.45, CONTENT_WIDTH * 0.3, CONTENT_WIDTH * 0.25]
  );

  doc.y += 4;

  // Performance issues
  if (violations.length > 0) {
    drawHorizontalRule(doc);
    doc
      .font(FONTS.bold)
      .fontSize(11)
      .fillColor(COLORS.darkBg)
      .text("Performance Issues", PAGE_MARGIN, doc.y);
    doc.y += 8;

    const grouped = groupViolationsBySeverity(violations);

    for (const [severity, items] of grouped) {
      for (const violation of items) {
        ensureSpace(doc, 50);

        drawSeverityBadge(doc, PAGE_MARGIN, doc.y, severity);

        doc
          .font(FONTS.regular)
          .fontSize(9)
          .fillColor(COLORS.darkBg)
          .text(violation.message, PAGE_MARGIN + 70, doc.y + 2, {
            width: CONTENT_WIDTH - 75,
          });

        doc.y += 22;

        const suggestion = result.suggestions.find(
          (s) => s.violationId === violation.id
        );
        if (suggestion) {
          doc
            .font(FONTS.oblique)
            .fontSize(8.5)
            .fillColor(COLORS.darkGray)
            .text(
              `Recommendation: ${suggestion.description}`,
              PAGE_MARGIN + 10,
              doc.y,
              { width: CONTENT_WIDTH - 20 }
            );
          doc.y += 4;
        }

        doc.y += 4;

        if (doc.y > PAGE_HEIGHT - PAGE_MARGIN - 40) {
          drawPageFooter(doc, currentPage);
          doc.addPage();
          currentPage++;
          doc.y = PAGE_MARGIN;
        }
      }
    }
  }

  drawPageFooter(doc, currentPage);
  return currentPage;
}

function buildRecommendationsPage(
  doc: PDFKit.PDFDocument,
  result: ScanResult,
  pageNum: number
): void {
  doc.addPage();

  drawSectionHeader(doc, "Recommendations & Next Steps");

  // Top 5 highest-impact fixes
  doc
    .font(FONTS.bold)
    .fontSize(12)
    .fillColor(COLORS.darkBg)
    .text("Top 5 Highest-Impact Fixes", PAGE_MARGIN, doc.y);
  doc.y += 8;

  // Sort violations by severity weight, take top 5
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

  if (sortedViolations.length === 0) {
    doc
      .font(FONTS.oblique)
      .fontSize(10)
      .fillColor(COLORS.pass)
      .text(
        "No critical fixes needed. Your site is in great shape!",
        PAGE_MARGIN,
        doc.y,
        { width: CONTENT_WIDTH }
      );
    doc.y += 20;
  } else {
    for (let i = 0; i < sortedViolations.length; i++) {
      const v = sortedViolations[i];
      const suggestion = result.suggestions.find(
        (s) => s.violationId === v.id
      );

      ensureSpace(doc, 50);

      // Number circle
      const numX = PAGE_MARGIN + 12;
      const numY = doc.y + 8;
      doc.circle(numX, numY, 10).fill(COLORS.orange);
      doc
        .font(FONTS.bold)
        .fontSize(10)
        .fillColor(COLORS.white)
        .text(String(i + 1), numX - 10, numY - 5, {
          width: 20,
          align: "center",
        });

      // Badge + description
      const textX = PAGE_MARGIN + 30;
      drawSeverityBadge(doc, textX, doc.y, v.severity);

      doc
        .font(FONTS.regular)
        .fontSize(9)
        .fillColor(COLORS.darkBg)
        .text(v.message, textX, doc.y + 18, {
          width: CONTENT_WIDTH - 40,
        });

      doc.y += 4;

      if (suggestion) {
        doc
          .font(FONTS.oblique)
          .fontSize(8.5)
          .fillColor(COLORS.darkGray)
          .text(
            `Fix: ${suggestion.description}`,
            textX + 8,
            doc.y,
            { width: CONTENT_WIDTH - 50 }
          );
        doc.y += 4;
      }

      doc.y += 10;
    }
  }

  doc.y += 8;
  drawHorizontalRule(doc);

  // Next steps
  doc
    .font(FONTS.bold)
    .fontSize(12)
    .fillColor(COLORS.darkBg)
    .text("Next Steps", PAGE_MARGIN, doc.y);
  doc.y += 8;

  const nextSteps = [
    "Address critical and high-severity violations first for maximum impact.",
    "Use the auto-fix suggestions where available to speed up remediation.",
    "Re-scan after applying fixes to verify improvements.",
    "Consider scheduling periodic scans for ongoing compliance monitoring.",
    "Supplement automated scanning with manual accessibility testing.",
  ];

  for (const step of nextSteps) {
    ensureSpace(doc, 20);
    doc
      .font(FONTS.regular)
      .fontSize(9.5)
      .fillColor(COLORS.darkGray)
      .text(`\u2022  ${step}`, PAGE_MARGIN + 8, doc.y, {
        width: CONTENT_WIDTH - 16,
      });
    doc.y += 4;
  }

  doc.y += 16;
  drawHorizontalRule(doc);

  // Branding footer
  doc
    .font(FONTS.regular)
    .fontSize(9.5)
    .fillColor(COLORS.darkGray)
    .text(
      "This report was generated by PreShip. For continuous monitoring, visit preship.dev",
      PAGE_MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, align: "center" }
    );

  doc.y += 20;

  // Disclaimer
  doc.save();
  doc
    .roundedRect(PAGE_MARGIN, doc.y, CONTENT_WIDTH, 50, 4)
    .fill("#FEF3C7");

  doc
    .font(FONTS.bold)
    .fontSize(8)
    .fillColor("#92400E")
    .text("Disclaimer", PAGE_MARGIN + 10, doc.y + 8, {
      width: CONTENT_WIDTH - 20,
    });

  doc
    .font(FONTS.regular)
    .fontSize(8)
    .fillColor("#92400E")
    .text(
      "This automated scan covers approximately 57% of WCAG issues. Manual testing is recommended for full compliance. This report does not constitute legal advice.",
      PAGE_MARGIN + 10,
      doc.y + 20,
      { width: CONTENT_WIDTH - 20 }
    );
  doc.restore();

  doc.y += 60;

  drawPageFooter(doc, pageNum);
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
        Title: `PreShip Compliance Report - ${scanResult.url}`,
        Author: "PreShip",
        Subject: "Accessibility Compliance Report",
        Creator: "PreShip (preship.dev)",
        Producer: "PDFKit",
      },
      autoFirstPage: false,
      bufferPages: true,
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    // Page 1: Cover
    doc.addPage();
    buildCoverPage(doc, scanResult);

    // Page 2: Executive Summary
    buildExecutiveSummary(doc, scanResult, 2);

    // Page 3+: Accessibility Results
    let nextPage = buildViolationsSection(
      doc,
      "Accessibility Audit (WCAG 2.1 Level AA)",
      "accessibility",
      scanResult,
      3
    );

    // Page 4+: Security Results
    nextPage = buildViolationsSection(
      doc,
      "Security Assessment",
      "security",
      scanResult,
      nextPage + 1
    );

    // Page 5+: Performance Results
    nextPage = buildPerformanceSection(doc, scanResult, nextPage + 1);

    // Final page: Recommendations
    buildRecommendationsPage(doc, scanResult, nextPage + 1);

    doc.end();
  });
}
