import PDFDocument from "pdfkit";
import type {
  ScanResult,
  Violation,
  FixSuggestion,
  CategoryScore,
  Severity,
  CheckCategory,
} from "@preship/shared";

// ── Brand Colors — Dark Theme ──────────────────────────────────────────

const C = {
  bg: "#0F0F0F",
  bgCard: "#1A1A1A",
  bgAccent: "#252525",
  border: "#2E2E2E",

  orange: "#F97316",
  orangeLight: "#FB923C",
  orangeDim: "#C2410C",

  white: "#FFFFFF",
  text: "#E5E5E5",
  textMuted: "#888888",
  textDim: "#555555",

  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#3B82F6",
  info: "#6B7280",

  pass: "#22C55E",
  fail: "#EF4444",

  scoreGreen: "#22C55E",
  scoreYellow: "#EAB308",
  scoreRed: "#EF4444",
} as const;

const F = {
  r: "Helvetica",
  b: "Helvetica-Bold",
  i: "Helvetica-Oblique",
  m: "Courier",
  mb: "Courier-Bold",
} as const;

// ── Helpers ─────────────────────────────────────────────────────────────

const M = 48; // margin
const W = 612;
const H = 792;
const CW = W - M * 2; // content width
const FZ = H - 40; // footer zone

function scoreColor(s: number): string {
  if (s >= 80) return C.scoreGreen;
  if (s >= 50) return C.scoreYellow;
  return C.scoreRed;
}

function scoreLabel(s: number): string {
  if (s >= 90) return "Excellent";
  if (s >= 70) return "Good";
  if (s >= 50) return "Needs Work";
  return "Poor";
}

function sevColor(s: Severity): string {
  return C[s] ?? C.info;
}

function fmt(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function trunc(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "\u2026";
}

function catData(cats: CategoryScore[], cat: CheckCategory): CategoryScore {
  return cats.find((c) => c.category === cat) ?? { category: cat, score: 0, violations: 0, passed: 0 };
}

function countSev(vs: Violation[], s: Severity): number {
  return vs.filter((v) => v.severity === s).length;
}

function space(doc: PDFKit.PDFDocument, n: number): boolean {
  if (doc.y + n > FZ) { doc.addPage(); doc.y = M; return true; }
  return false;
}

// ── Drawing ─────────────────────────────────────────────────────────────

function darkPage(doc: PDFKit.PDFDocument): void {
  doc.rect(0, 0, W, H).fill(C.bg);
}

function drawCircle(
  doc: PDFKit.PDFDocument, x: number, y: number, r: number, score: number,
  opts?: { size?: number; label?: string }
): void {
  const color = scoreColor(score);
  const sz = opts?.size ?? 28;

  // Track
  doc.save();
  doc.circle(x, y, r).lineWidth(5).strokeColor(C.bgAccent).stroke();

  // Arc
  if (score > 0) {
    const start = -Math.PI / 2;
    const end = start + (2 * Math.PI * Math.min(score, 100)) / 100;
    const segs = Math.max(2, Math.floor(score / 2));
    doc.lineWidth(5).strokeColor(color);
    for (let i = 0; i < segs; i++) {
      const a1 = start + (end - start) * (i / segs);
      const a2 = start + (end - start) * ((i + 1) / segs);
      doc.moveTo(x + r * Math.cos(a1), y + r * Math.sin(a1))
         .lineTo(x + r * Math.cos(a2), y + r * Math.sin(a2)).stroke();
    }
  }
  doc.restore();

  // Number
  doc.font(F.b).fontSize(sz).fillColor(color)
    .text(String(score), x - r, y - sz / 2, { width: r * 2, align: "center" });

  // Label
  if (opts?.label) {
    doc.font(F.r).fontSize(8).fillColor(C.textMuted)
      .text(opts.label, x - r - 10, y + r + 8, { width: r * 2 + 20, align: "center" });
  }
}

function drawBar(
  doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number,
  pct: number, color: string
): void {
  doc.roundedRect(x, y, w, h, h / 2).fill(C.bgAccent);
  if (pct > 0) {
    doc.roundedRect(x, y, Math.max(h, w * pct / 100), h, h / 2).fill(color);
  }
}

function sevBadge(doc: PDFKit.PDFDocument, x: number, y: number, sev: Severity): number {
  const label = sev.charAt(0).toUpperCase() + sev.slice(1);
  doc.font(F.b).fontSize(7);
  const tw = doc.widthOfString(label);
  const bw = tw + 12;
  doc.roundedRect(x, y, bw, 14, 3).fill(sevColor(sev));
  doc.font(F.b).fontSize(7).fillColor(C.white).text(label, x + 6, y + 3);
  return bw;
}

function header(doc: PDFKit.PDFDocument, title: string): void {
  space(doc, 45);
  const y = doc.y;
  // Orange accent line
  doc.rect(M, y, 3, 22).fill(C.orange);
  doc.font(F.b).fontSize(14).fillColor(C.white).text(title, M + 12, y + 3);
  doc.y = y + 32;
}

function footers(doc: PDFKit.PDFDocument): void {
  const n = doc.bufferedPageRange().count;
  for (let i = 0; i < n; i++) {
    doc.switchToPage(i);
    // Thin line
    doc.save().moveTo(M, FZ).lineTo(W - M, FZ).lineWidth(0.5).strokeColor(C.border).stroke().restore();
    doc.font(F.r).fontSize(7).fillColor(C.textDim)
      .text("preship.dev", M, FZ + 6, { width: CW / 2 })
      .text(`${i + 1} / ${n}`, M + CW / 2, FZ + 6, { width: CW / 2, align: "right" });
  }
}

// ── Cover Page ──────────────────────────────────────────────────────────

function cover(doc: PDFKit.PDFDocument, r: ScanResult): void {
  darkPage(doc);

  // Orange gradient strip at top
  doc.rect(0, 0, W, 6).fill(C.orange);

  // "PRESHIP" wordmark
  doc.font(F.b).fontSize(14).fillColor(C.orange)
    .text("PRESHIP", M, 50, { width: CW, align: "left" });

  // "Quality Report" title
  doc.font(F.b).fontSize(36).fillColor(C.white)
    .text("Quality Report", M, 90, { width: CW });

  // URL
  doc.font(F.r).fontSize(13).fillColor(C.orangeLight)
    .text(r.url, M, 140, { width: CW });

  // Thin separator
  doc.moveTo(M, 170).lineTo(W - M, 170).lineWidth(0.5).strokeColor(C.border).stroke();

  // Big score circle
  drawCircle(doc, W / 2, 290, 70, r.overallScore, { size: 42 });
  doc.font(F.b).fontSize(16).fillColor(scoreColor(r.overallScore))
    .text(scoreLabel(r.overallScore), M, 370, { width: CW, align: "center" });
  doc.font(F.r).fontSize(9).fillColor(C.textMuted)
    .text("Overall Quality Score", M, 390, { width: CW, align: "center" });

  // Severity summary — horizontal pills
  const sevs = [
    { s: "critical" as Severity, n: countSev(r.violations, "critical") },
    { s: "high" as Severity, n: countSev(r.violations, "high") },
    { s: "medium" as Severity, n: countSev(r.violations, "medium") },
    { s: "low" as Severity, n: countSev(r.violations, "low") },
  ];
  const pillW = 110;
  const pillH = 28;
  const pillY = 430;
  const pillStartX = (W - pillW * 4 - 12 * 3) / 2;

  for (let i = 0; i < sevs.length; i++) {
    const px = pillStartX + i * (pillW + 12);
    doc.roundedRect(px, pillY, pillW, pillH, 6).fill(C.bgCard);
    doc.circle(px + 14, pillY + pillH / 2, 4).fill(sevColor(sevs[i].s));
    doc.font(F.b).fontSize(14).fillColor(C.white)
      .text(String(sevs[i].n), px + 24, pillY + 4, { width: 30 });
    doc.font(F.r).fontSize(8).fillColor(C.textMuted)
      .text(sevs[i].s.charAt(0).toUpperCase() + sevs[i].s.slice(1), px + 52, pillY + 8, { width: pillW - 58 });
  }

  // Metadata footer
  const metaY = 490;
  const meta = [
    `Scanned: ${fmt(r.createdAt)}`,
    `Duration: ${(r.duration / 1000).toFixed(1)}s`,
    `Pages: ${r.pagesScanned}`,
    `Violations: ${r.violations.length}`,
  ].join("  \u00B7  ");

  doc.font(F.r).fontSize(8).fillColor(C.textDim)
    .text(meta, M, metaY, { width: CW, align: "center" });

  // Bottom branding
  doc.font(F.r).fontSize(8).fillColor(C.textDim)
    .text("Generated by PreShip \u2014 preship.dev", M, H - 50, { width: CW, align: "center" });
}

// ── Summary Page ────────────────────────────────────────────────────────

function summary(doc: PDFKit.PDFDocument, r: ScanResult): void {
  doc.addPage();
  darkPage(doc);
  doc.y = M;

  header(doc, "Executive Summary");

  // Category circles row
  const cats: { l: string; c: CheckCategory }[] = [
    { l: "Accessibility", c: "accessibility" },
    { l: "Security", c: "security" },
    { l: "Performance", c: "performance" },
  ];

  const spacing = CW / cats.length;
  const cy = doc.y + 35;

  for (let i = 0; i < cats.length; i++) {
    const cd = catData(r.categories, cats[i].c);
    drawCircle(doc, M + spacing / 2 + i * spacing, cy, 28, cd.score, { size: 18, label: cats[i].l });
  }

  doc.y = cy + 55;

  // Stats grid — 2x2 dark cards
  const stats = [
    { label: "Total Violations", value: String(r.violations.length) },
    { label: "Critical Issues", value: String(countSev(r.violations, "critical")) },
    { label: "Pages Scanned", value: String(r.pagesScanned) },
    { label: "Auto-Fixable", value: String(r.suggestions.filter((s) => s.confidence >= 0.8).length) },
  ];

  const cardW = (CW - 12) / 2;
  const cardH = 50;

  for (let i = 0; i < stats.length; i++) {
    const cx = M + (i % 2) * (cardW + 12);
    const cyy = doc.y + Math.floor(i / 2) * (cardH + 8);
    doc.roundedRect(cx, cyy, cardW, cardH, 6).fill(C.bgCard);
    doc.font(F.b).fontSize(22).fillColor(C.orange)
      .text(stats[i].value, cx + 16, cyy + 8, { width: cardW - 32 });
    doc.font(F.r).fontSize(8).fillColor(C.textMuted)
      .text(stats[i].label, cx + 16, cyy + 34, { width: cardW - 32 });
  }

  doc.y += Math.ceil(stats.length / 2) * (cardH + 8) + 12;

  // Compliance badges — horizontal
  const a11y = r.violations.filter((v) => v.category === "accessibility");
  const sec = r.violations.filter((v) => v.category === "security");
  const perf = catData(r.categories, "performance");

  const badges = [
    { label: "WCAG 2.1 AA", pass: a11y.filter((v) => v.severity === "critical").length === 0 },
    { label: "OWASP Security", pass: sec.filter((v) => v.severity === "critical").length === 0 },
    { label: "Core Web Vitals", pass: perf.score >= 70 },
  ];

  const bw = (CW - 16) / 3;
  const by = doc.y;

  for (let i = 0; i < badges.length; i++) {
    const bx = M + i * (bw + 8);
    const bg = badges[i].pass ? "#0A2E1A" : "#2E0A0A";
    const tc = badges[i].pass ? C.pass : C.fail;
    const status = badges[i].pass ? "PASS" : "FAIL";

    doc.roundedRect(bx, by, bw, 36, 4).fill(bg);
    doc.font(F.r).fontSize(7).fillColor(tc)
      .text(badges[i].label, bx + 10, by + 6, { width: bw - 20 });
    doc.font(F.b).fontSize(13).fillColor(tc)
      .text(status, bx + 10, by + 18, { width: bw - 20 });
  }

  doc.y = by + 48;

  // Category score bars
  header(doc, "Score Breakdown");

  const allCats: { l: string; c: CheckCategory }[] = [
    { l: "Accessibility", c: "accessibility" },
    { l: "Security", c: "security" },
    { l: "Performance", c: "performance" },
    { l: "SEO", c: "seo" },
    { l: "Privacy", c: "privacy" },
    { l: "Mobile", c: "mobile" },
  ];

  for (const cat of allCats) {
    const cd = catData(r.categories, cat.c);
    if (cd.score === 0 && cd.passed === 0 && cd.violations === 0) continue;

    space(doc, 24);
    const ry = doc.y;

    doc.font(F.r).fontSize(9).fillColor(C.text)
      .text(cat.l, M, ry + 2, { width: 90 });

    drawBar(doc, M + 95, ry + 2, CW - 145, 10, cd.score, scoreColor(cd.score));

    doc.font(F.b).fontSize(9).fillColor(scoreColor(cd.score))
      .text(String(cd.score), W - M - 30, ry + 1, { width: 30, align: "right" });

    doc.y = ry + 22;
  }
}

// ── Violations ──────────────────────────────────────────────────────────

function violations(
  doc: PDFKit.PDFDocument, title: string, cat: CheckCategory, r: ScanResult
): void {
  const vs = r.violations.filter((v) => v.category === cat);
  if (vs.length === 0) return;

  space(doc, 100);
  header(doc, `${title} (${vs.length} issues)`);

  // Group by severity
  const order: Severity[] = ["critical", "high", "medium", "low", "info"];

  for (const sev of order) {
    const items = vs.filter((v) => v.severity === sev);
    if (items.length === 0) continue;

    space(doc, 40);

    // Severity group label
    doc.font(F.b).fontSize(10).fillColor(sevColor(sev))
      .text(`${sev.charAt(0).toUpperCase() + sev.slice(1)} \u2014 ${items.length}`, M, doc.y);
    doc.y += 6;

    for (const v of items) {
      space(doc, 50);
      const vy = doc.y;

      // Left accent bar
      const cardX = M;
      const textX = M + 8;
      const textW = CW - 12;

      // Rule name (monospace, muted)
      if (v.rule) {
        doc.font(F.m).fontSize(7).fillColor(C.textDim)
          .text(trunc(v.rule, 70), textX, vy);
        doc.y = vy + 11;
      }

      // Message
      doc.font(F.r).fontSize(8.5).fillColor(C.text)
        .text(v.message, textX, doc.y, { width: textW });

      // Element (critical/high only)
      if (v.element && (sev === "critical" || sev === "high")) {
        doc.y += 2;
        const code = trunc(v.element, 120);
        doc.font(F.m).fontSize(6.5);
        const codeH = doc.heightOfString(code, { width: textW - 16 }) + 8;
        doc.roundedRect(textX, doc.y, textW, codeH, 3).fill(C.bgAccent);
        doc.font(F.m).fontSize(6.5).fillColor(C.textMuted)
          .text(code, textX + 8, doc.y + 4, { width: textW - 16 });
        doc.y += codeH;
      }

      // Fix suggestion
      const fix = r.suggestions.find((s) => s.violationId === v.id);
      if (fix) {
        doc.y += 2;
        doc.font(F.i).fontSize(7.5).fillColor(C.pass)
          .text(`\u2192 ${trunc(fix.description, 130)}`, textX, doc.y, { width: textW });
      }

      // Draw accent bar
      const endY = doc.y;
      doc.rect(cardX, vy, 3, endY - vy).fill(sevColor(sev));

      doc.y += 8;
    }
  }
}

// ── Recommendations ─────────────────────────────────────────────────────

function recommendations(doc: PDFKit.PDFDocument, r: ScanResult): void {
  if (r.violations.length === 0) {
    space(doc, 80);
    header(doc, "Summary");
    doc.font(F.r).fontSize(10).fillColor(C.pass)
      .text("\u2713  No issues found. Your site is in great shape!", M, doc.y, { width: CW });
    doc.y += 20;
    doc.font(F.r).fontSize(8).fillColor(C.textDim)
      .text("Schedule periodic scans at preship.dev for ongoing monitoring.", M, doc.y, { width: CW, align: "center" });
    return;
  }

  space(doc, 150);
  header(doc, "Top Fixes by Impact");

  const sevOrder: Record<Severity, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  const sorted = [...r.violations].sort((a, b) => sevOrder[b.severity] - sevOrder[a.severity]).slice(0, 5);

  for (let i = 0; i < sorted.length; i++) {
    space(doc, 40);
    const v = sorted[i];
    const ry = doc.y;

    // Number circle
    doc.circle(M + 10, ry + 7, 9).fill(C.orange);
    doc.font(F.b).fontSize(9).fillColor(C.white)
      .text(String(i + 1), M + 1, ry + 3, { width: 18, align: "center" });

    // Severity + message
    const bw = sevBadge(doc, M + 26, ry, v.severity);
    doc.font(F.r).fontSize(8).fillColor(C.text)
      .text(trunc(v.message, 100), M + 30 + bw, ry + 2, { width: CW - 34 - bw });

    doc.y = ry + 18;

    const fix = r.suggestions.find((s) => s.violationId === v.id);
    if (fix) {
      doc.font(F.i).fontSize(7.5).fillColor(C.textMuted)
        .text(`\u2192 ${trunc(fix.description, 120)}`, M + 26, doc.y, { width: CW - 30 });
      doc.y += 4;
    }

    doc.y += 8;
  }

  // CTA
  doc.y += 12;
  doc.roundedRect(M, doc.y, CW, 40, 6).fill(C.bgCard);
  doc.font(F.b).fontSize(10).fillColor(C.orange)
    .text("Scan again after fixes \u2192 preship.dev", M, doc.y + 12, { width: CW, align: "center" });
  doc.y += 50;
}

// ── Public API ──────────────────────────────────────────────────────────

export async function generatePdfReport(result: ScanResult): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: "letter",
      margins: { top: M, bottom: M, left: M, right: M },
      info: {
        Title: `PreShip Quality Report - ${result.url}`,
        Author: "PreShip",
        Subject: "Quality Report",
        Creator: "PreShip (preship.dev)",
      },
      autoFirstPage: false,
      bufferPages: true,
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    // Cover
    doc.addPage();
    cover(doc, result);

    // Summary
    summary(doc, result);

    // Violation sections (skip empty)
    violations(doc, "Accessibility Audit", "accessibility", result);
    violations(doc, "Security Assessment", "security", result);
    violations(doc, "Performance Analysis", "performance", result);
    violations(doc, "SEO Audit", "seo", result);
    violations(doc, "Privacy Check", "privacy", result);
    violations(doc, "Mobile Usability", "mobile", result);

    // Recommendations
    recommendations(doc, result);

    // Footers on all pages
    footers(doc);

    doc.end();
  });
}
