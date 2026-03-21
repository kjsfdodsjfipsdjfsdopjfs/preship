"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { API_BASE } from "@/hooks/useApi";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Violation {
  id: string;
  category: string;
  severity: string;
  rule: string;
  message: string;
  element?: string;
  selector?: string;
  url: string;
  help?: string;
  helpUrl?: string;
}

interface CategoryScore {
  category: string;
  score: number;
  violations: number;
  passed?: number;
}

interface PillarScore {
  pillar: string;
  score: number;
  categories: CategoryScore[];
}

type ShipReadiness = "SHIP IT" | "ALMOST READY" | "NEEDS WORK" | "DO NOT SHIP";

interface ScanData {
  id: string;
  scanId?: string;
  url: string;
  status: string;
  overallScore: number;
  shipReadiness?: ShipReadiness;
  pillars?: PillarScore[];
  categories: CategoryScore[];
  violations: Violation[];
  suggestions?: { violationId: string; description: string; codeSnippet?: string }[];
  createdAt: string;
  completedAt?: string;
  previousScore?: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function getScoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 50) return "#EAB308";
  return "#EF4444";
}

function getLetterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return "text-red-400";
    case "high": return "text-orange-400";
    case "medium": return "text-yellow-400";
    case "low": return "text-neutral-400";
    default: return "text-neutral-500";
  }
}

function getSeverityDot(severity: string): string {
  switch (severity) {
    case "critical": return "bg-red-400";
    case "high": return "bg-orange-400";
    case "medium": return "bg-yellow-400";
    case "low": return "bg-neutral-400";
    default: return "bg-neutral-500";
  }
}

function getShipReadinessColor(readiness: ShipReadiness): string {
  switch (readiness) {
    case "SHIP IT": return "#22C55E";
    case "ALMOST READY": return "#EAB308";
    case "NEEDS WORK": return "#F97316";
    case "DO NOT SHIP": return "#EF4444";
  }
}

function getShipReadinessBg(readiness: ShipReadiness): string {
  switch (readiness) {
    case "SHIP IT": return "bg-green-500/10 border-green-500/30";
    case "ALMOST READY": return "bg-yellow-500/10 border-yellow-500/30";
    case "NEEDS WORK": return "bg-orange-500/10 border-orange-500/30";
    case "DO NOT SHIP": return "bg-red-500/10 border-red-500/30";
  }
}

function computeShipReadiness(score: number): ShipReadiness {
  if (score >= 90) return "SHIP IT";
  if (score >= 70) return "ALMOST READY";
  if (score >= 50) return "NEEDS WORK";
  return "DO NOT SHIP";
}

const PILLAR_CONFIG: Record<string, { icon: string; label: string; categories: string[] }> = {
  technical: { icon: "\uD83D\uDCCA", label: "Technical", categories: ["accessibility", "security", "performance", "seo", "privacy", "mobile"] },
  product: { icon: "\uD83C\uDFA8", label: "Product", categories: ["ux", "design", "human_appeal"] },
  business: { icon: "\uD83D\uDCB0", label: "Business", categories: ["business", "revenue", "growth"] },
};

const ALL_CATEGORY_LABELS: Record<string, string> = {
  accessibility: "Accessibility",
  security: "Security",
  performance: "Performance",
  seo: "SEO",
  privacy: "Privacy",
  mobile: "Mobile",
  ux: "UX/UI",
  design: "Design",
  human_appeal: "Human Appeal",
  business: "Business Viability",
  revenue: "Revenue Potential",
  growth: "Growth Potential",
};

/* ------------------------------------------------------------------ */
/* Violation translator                                                */
/* ------------------------------------------------------------------ */
interface TranslatedViolation {
  title: string;
  description: string;
  category: string;
  severity: string;
  selector?: string;
}

function translateViolation(v: Violation): TranslatedViolation {
  const humanTitle = v.rule
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: humanTitle,
    description: v.message || v.help || "This issue may affect users of your site.",
    category: v.category,
    severity: v.severity,
    selector: v.selector,
  };
}

/* ------------------------------------------------------------------ */
/* Prompt generator                                                    */
/* ------------------------------------------------------------------ */
function generateFixPrompt(violations: Violation[], tool: "cursor" | "claude" | "v0", url: string): string {
  const header =
    tool === "cursor"
      ? `I scanned ${url} with PreShip and found these issues. Fix them:\n\n`
      : tool === "claude"
        ? `I ran a PreShip scan on ${url}. Here are the violations I need to fix:\n\n`
        : `Fix these issues found by PreShip on ${url}:\n\n`;

  const body = violations
    .map((v, i) => {
      const t = translateViolation(v);
      return `${i + 1}. [${v.category.toUpperCase()}] ${t.title}\n   ${t.description}${v.selector ? `\n   Element: ${v.selector}` : ""}`;
    })
    .join("\n\n");

  const footer =
    tool === "cursor"
      ? "\n\nPlease fix each issue and explain the changes."
      : tool === "claude"
        ? "\n\nFor each violation, provide the fix with code changes."
        : "\n\nGenerate updated components that fix these issues.";

  return header + body + footer;
}

/* ------------------------------------------------------------------ */
/* Score Ring — compact, used in hero                                   */
/* ------------------------------------------------------------------ */
function ScoreRing({
  score,
  size = 160,
  strokeWidth = 6,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1A1A1A" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
            transition: "stroke-dashoffset 1s ease-out",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold tabular-nums text-4xl" style={{ color }}>
          {score}
        </span>
        <span className="text-lg font-bold text-neutral-400">{getLetterGrade(score)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ship Readiness Badge                                                */
/* ------------------------------------------------------------------ */
function ShipReadinessBadge({ readiness }: { readiness: ShipReadiness }) {
  const color = getShipReadinessColor(readiness);
  const bgClass = getShipReadinessBg(readiness);
  return (
    <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl border ${bgClass}`}>
      <span className="text-lg">
        {readiness === "SHIP IT" ? "\uD83D\uDE80" : readiness === "ALMOST READY" ? "\u26A0\uFE0F" : readiness === "NEEDS WORK" ? "\uD83D\uDEE0\uFE0F" : "\uD83D\uDED1"}
      </span>
      <span className="text-lg font-bold tracking-wide" style={{ color }}>{readiness}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pillar Card                                                         */
/* ------------------------------------------------------------------ */
function PillarCard({ pillar, score, categories, icon }: { pillar: string; score: number; categories: CategoryScore[]; icon: string }) {
  const color = getScoreColor(score);
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-semibold text-white">{pillar}</span>
      </div>
      <div className="text-3xl font-bold tabular-nums mb-4" style={{ color }}>{score}</div>
      <div className="space-y-2">
        {categories.map((cat) => {
          const catColor = getScoreColor(cat.score);
          return (
            <div key={cat.category} className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">{ALL_CATEGORY_LABELS[cat.category] || cat.category}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.score}%`, backgroundColor: catColor }} />
                </div>
                <span className="text-xs font-medium tabular-nums w-6 text-right" style={{ color: catColor }}>{cat.score}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category bar — legacy fallback for old 6-category scans              */
/* ------------------------------------------------------------------ */
function CategoryBar({ categories }: { categories: CategoryScore[] }) {
  const shortLabels: Record<string, string> = {
    accessibility: "A11y",
    security: "Security",
    performance: "Perf",
    seo: "SEO",
    privacy: "Privacy",
    mobile: "Mobile",
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {categories.map((cat) => {
        const color = getScoreColor(cat.score);
        return (
          <div
            key={cat.category}
            className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border border-neutral-800 bg-neutral-900/50"
          >
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{shortLabels[cat.category] || cat.category}</span>
            <span className="text-lg font-bold tabular-nums leading-none" style={{ color }}>
              {cat.score}
            </span>
            {cat.violations > 0 ? (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                {cat.violations} issue{cat.violations !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400">
                pass
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-sm font-medium shadow-xl transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confetti                                                            */
/* ------------------------------------------------------------------ */
function Confetti() {
  const colors = ["#F97316", "#22C55E", "#EAB308", "#3B82F6", "#A855F7", "#EC4899"];
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 40 }).map((_, i) => {
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 2;
        const size = 5 + Math.random() * 5;
        const rotation = Math.random() * 360;
        return (
          <div
            key={i}
            className="absolute top-0"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size * 0.6}px`,
              backgroundColor: color,
              borderRadius: "2px",
              transform: `rotate(${rotation}deg)`,
              animation: `confetti-fall ${duration}s ${delay}s linear forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading state                                                       */
/* ------------------------------------------------------------------ */
const SCAN_STEPS = [
  "Checking accessibility...",
  "Checking security...",
  "Checking performance...",
  "Checking SEO...",
  "Checking privacy...",
  "Checking mobile...",
  "Analyzing results...",
];

function ScanningState({ url }: { url?: string }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SCAN_STEPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const progress = ((stepIndex + 1) / SCAN_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
            <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Scanning {url ? new URL(url).hostname : "your site"}
          </h1>
          <p className="text-neutral-500 text-sm mb-10">Usually takes 15-30 seconds</p>

          <div className="w-full h-1.5 rounded-full bg-neutral-800 mb-5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-neutral-400">{SCAN_STEPS[stepIndex]}</p>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error state                                                         */
/* ------------------------------------------------------------------ */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-3">Scan Failed</h1>
          <p className="text-neutral-400 text-sm mb-8">{message}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
          >
            Try another URL
          </a>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Group violations by rule (dedup)                                    */
/* ------------------------------------------------------------------ */
interface GroupedViolation {
  title: string;
  description: string;
  severity: string;
  category: string;
  count: number;
  selectors: string[];
}

function groupByRule(violations: TranslatedViolation[]): GroupedViolation[] {
  const map = new Map<string, GroupedViolation>();
  for (const v of violations) {
    const key = v.title;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      if (v.selector && existing.selectors.length < 3) {
        existing.selectors.push(v.selector);
      }
    } else {
      map.set(key, {
        title: v.title,
        description: v.description,
        severity: v.severity,
        category: v.category,
        count: 1,
        selectors: v.selector ? [v.selector] : [],
      });
    }
  }
  // Sort: critical first, then high, then by count
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return Array.from(map.values()).sort((a, b) => {
    const sa = severityOrder[a.severity] ?? 5;
    const sb = severityOrder[b.severity] ?? 5;
    if (sa !== sb) return sa - sb;
    return b.count - a.count;
  });
}

/* ------------------------------------------------------------------ */
/* Expandable category section                                         */
/* ------------------------------------------------------------------ */
const MAX_VISIBLE = 5;

function ViolationGroup({
  category,
  violations,
  totalRaw,
  defaultOpen,
}: {
  category: string;
  violations: TranslatedViolation[];
  totalRaw: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const labels = ALL_CATEGORY_LABELS;

  const grouped = groupByRule(violations);
  const critical = grouped.filter((v) => v.severity === "critical").reduce((s, v) => s + v.count, 0);
  const high = grouped.filter((v) => v.severity === "high").reduce((s, v) => s + v.count, 0);

  const visible = showAll ? grouped : grouped.slice(0, MAX_VISIBLE);
  const hiddenCount = grouped.length - MAX_VISIBLE;

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-900/80 hover:bg-neutral-900 transition-colors text-left cursor-pointer"
      >
        <svg
          className={`w-4 h-4 text-neutral-500 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-medium text-white flex-1">
          {labels[category] || category}
        </span>
        {critical > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">
            {critical} critical
          </span>
        )}
        {high > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">
            {high} high
          </span>
        )}
        <span className="text-xs text-neutral-500 tabular-nums">
          {grouped.length === totalRaw ? totalRaw : `${grouped.length} rules · ${totalRaw} total`}
        </span>
      </button>

      {open && (
        <div>
          <div className="divide-y divide-neutral-800/50">
            {visible.map((v, idx) => (
              <div key={idx} className="px-4 py-3 flex items-start gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${getSeverityDot(v.severity)}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white leading-snug">{v.title}</p>
                    {v.count > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-medium tabular-nums flex-shrink-0">
                        x{v.count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{v.description}</p>
                </div>
                <span className={`text-[10px] flex-shrink-0 ${getSeverityColor(v.severity)}`}>
                  {v.severity}
                </span>
              </div>
            ))}
          </div>

          {!showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full px-4 py-2.5 text-xs text-orange-400 hover:text-orange-300 font-medium border-t border-neutral-800 hover:bg-neutral-900/50 transition-colors cursor-pointer"
            >
              Show {hiddenCount} more rule{hiddenCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Results Page                                                   */
/* ------------------------------------------------------------------ */
export default function ResultsPage() {
  const params = useParams();
  const id = params.id as string;

  const [scan, setScan] = useState<ScanData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- fetch & poll ---- */
  const fetchScan = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/scan/public/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Scan not found. It may have expired or the URL is incorrect.");
        } else {
          setError("Failed to load scan results. Please try again.");
        }
        setLoading(false);
        return;
      }
      const json = await res.json();
      const data: ScanData = json.data ?? json;
      setScan(data);
      setLoading(false);

      if (data.status === "completed" || data.status === "failed") {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        if (data.status === "completed" && data.overallScore >= 80) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
        }
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchScan();
    pollingRef.current = setInterval(fetchScan, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchScan]);

  /* ---- toast ---- */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied! Paste in ${label} to fix.`);
    } catch {
      showToast("Failed to copy.");
    }
  };

  /* ---- render states ---- */
  if (loading && !scan) return <ScanningState />;
  if (error) return <ErrorState message={error} />;
  if (!scan) return <ErrorState message="Scan not found." />;
  if (scan.status !== "completed" && scan.status !== "failed") return <ScanningState url={scan.url} />;
  if (scan.status === "failed") return <ErrorState message="The scan failed. The site may be unreachable or blocking our scanner." />;

  /* ---- completed scan ---- */
  const domain = (() => { try { return new URL(scan.url).hostname; } catch { return scan.url; } })();
  const violations = scan.violations ?? [];
  const categories = scan.categories ?? [];
  const scanDate = new Date(scan.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // New 12-category / 3-pillar system (backwards compatible)
  const shipReadiness: ShipReadiness = scan.shipReadiness ?? computeShipReadiness(scan.overallScore);
  const hasPillars = !!(scan.pillars && scan.pillars.length > 0);

  // Build pillar data: use API pillars if available, otherwise derive from categories
  const pillarData: PillarScore[] = hasPillars
    ? scan.pillars!
    : (() => {
        // Only build synthetic pillars if we have more than the legacy 3 categories
        const pillarKeys = Object.keys(PILLAR_CONFIG);
        const built: PillarScore[] = [];
        for (const key of pillarKeys) {
          const conf = PILLAR_CONFIG[key];
          const pillarCats = categories.filter((c) => conf.categories.includes(c.category));
          if (pillarCats.length > 0) {
            const avg = Math.round(pillarCats.reduce((s, c) => s + c.score, 0) / pillarCats.length);
            built.push({ pillar: key, score: avg, categories: pillarCats });
          }
        }
        // Only return pillar view if we have categories beyond the old 3
        return built.length > 1 ? built : [];
      })();

  // Group violations by category
  const grouped: Record<string, TranslatedViolation[]> = {};
  violations.forEach((v) => {
    const t = translateViolation(v);
    if (!grouped[v.category]) grouped[v.category] = [];
    grouped[v.category].push(t);
  });

  // Sort categories: most issues first
  const sortedCategories = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  // Share
  const twitterText = `Just scanned ${domain} with @preshipdev — scored ${scan.overallScore}/100. Check your app free at preship.dev`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://preship.dev/results/${id}`)}`;
  const badgeMarkdown = `[![PreShip Score](https://preship.dev/api/og/scan/${id})](https://preship.dev/results/${id})`;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      {showConfetti && <Confetti />}
      <Toast message={toast || ""} visible={!!toast} />

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">

          {/* ========== HERO: Score + Domain + Ship Readiness ========== */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8 mb-6">
            {/* Top: Score + Domain info side by side on desktop */}
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-10 mb-6">
              {/* Score ring — fixed size, no shrink */}
              <div className="flex-shrink-0">
                <ScoreRing score={scan.overallScore} />
              </div>

              {/* Info — takes remaining space */}
              <div className="flex-1 min-w-0 text-center lg:text-left">
                <h1 className="text-2xl font-bold text-white mb-1">{domain}</h1>
                <p className="text-xs text-neutral-500 mb-1">
                  Scanned {scanDate} &middot; {violations.length} issue{violations.length !== 1 ? "s" : ""} found
                </p>

                {/* Ship Readiness Badge */}
                <div className="mt-3">
                  <ShipReadinessBadge readiness={shipReadiness} />
                </div>

                {/* Improvement banner inline */}
                {scan.previousScore !== undefined && scan.previousScore !== null && scan.overallScore > scan.previousScore && (
                  <p className="text-sm text-orange-400 font-medium mt-3">
                    Improved from {scan.previousScore} to {scan.overallScore}
                  </p>
                )}
              </div>
            </div>

            {/* Pillar cards or legacy category bar */}
            {hasPillars ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pillarData.map((p) => {
                  const config = PILLAR_CONFIG[p.pillar];
                  return (
                    <PillarCard
                      key={p.pillar}
                      pillar={config?.label || p.pillar}
                      score={p.score}
                      categories={p.categories}
                      icon={config?.icon || "\uD83D\uDCCA"}
                    />
                  );
                })}
              </div>
            ) : (
              <CategoryBar categories={categories} />
            )}
          </div>

          {/* ========== FIX WITH AI — most valuable section ========== */}
          {violations.length > 0 && (
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 md:p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Fix with AI</h2>
                  <p className="text-xs text-neutral-500">Copy a prompt and paste it in your AI tool</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { tool: "cursor" as const, label: "Cursor" },
                  { tool: "claude" as const, label: "Claude" },
                  { tool: "v0" as const, label: "v0" },
                ].map(({ tool, label }) => (
                  <button
                    key={tool}
                    onClick={() => copyToClipboard(generateFixPrompt(violations, tool, scan.url), label)}
                    className="px-3 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition-colors border border-neutral-800 hover:border-neutral-700 cursor-pointer"
                  >
                    Copy for {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ========== ISSUES — organized by pillar then category ========== */}
          {violations.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
                  Issues by category
                </h2>
                <button
                  onClick={() => {
                    const lines = violations.map((v) => {
                      const t = translateViolation(v);
                      return `[${v.category.toUpperCase()}] [${v.severity}] ${t.title}\n  ${t.description}${v.selector ? `\n  Element: ${v.selector}` : ""}`;
                    });
                    const text = `PreShip Scan Report — ${domain}\nScore: ${scan.overallScore}/100\nVerdict: ${shipReadiness}\n${violations.length} issues found\n${"=".repeat(50)}\n\n${lines.join("\n\n")}`;
                    const blob = new Blob([text], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `preship-${domain}-violations.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast("Full report downloaded!");
                  }}
                  className="text-xs text-neutral-500 hover:text-orange-400 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download all {violations.length}
                </button>
              </div>

              {/* Organize by pillar groups if we have pillar data */}
              {pillarData.length > 0 ? (
                <div className="space-y-6">
                  {pillarData.map((p) => {
                    const config = PILLAR_CONFIG[p.pillar];
                    const pillarCategories = config?.categories || [];
                    const pillarViolations = sortedCategories.filter(([cat]) => pillarCategories.includes(cat));
                    if (pillarViolations.length === 0) return null;
                    return (
                      <div key={p.pillar}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{config?.icon}</span>
                          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{config?.label || p.pillar}</h3>
                        </div>
                        <div className="space-y-2">
                          {pillarViolations.map(([category, items], idx) => (
                            <ViolationGroup
                              key={category}
                              category={category}
                              violations={items}
                              totalRaw={items.length}
                              defaultOpen={idx === 0}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Show any violations in categories not in any pillar */}
                  {(() => {
                    const allPillarCats = Object.values(PILLAR_CONFIG).flatMap((c) => c.categories);
                    const uncategorized = sortedCategories.filter(([cat]) => !allPillarCats.includes(cat));
                    if (uncategorized.length === 0) return null;
                    return (
                      <div>
                        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Other</h3>
                        <div className="space-y-2">
                          {uncategorized.map(([category, items], idx) => (
                            <ViolationGroup
                              key={category}
                              category={category}
                              violations={items}
                              totalRaw={items.length}
                              defaultOpen={idx === 0}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedCategories.map(([category, items], idx) => (
                    <ViolationGroup
                      key={category}
                      category={category}
                      violations={items}
                      totalRaw={items.length}
                      defaultOpen={idx === 0}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== SHARE + BADGE — compact row ========== */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex gap-2 flex-shrink-0">
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-colors border border-neutral-700"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share
                </a>
                <a
                  href={linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-colors border border-neutral-700"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-[10px] text-neutral-500 truncate flex-1 bg-neutral-800 rounded px-2 py-1.5 border border-neutral-700">
                    {badgeMarkdown}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(badgeMarkdown); showToast("Badge copied!"); }}
                    className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors flex-shrink-0"
                    title="Copy badge"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========== SCAN AGAIN ========== */}
          <div className="text-center py-8">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
            >
              Scan another app
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-800 py-6">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <p className="text-xs text-neutral-600">&copy; {new Date().getFullYear()} PreShip</p>
          <a href="https://preship.dev" className="text-xs text-orange-500/60 hover:text-orange-400">
            preship.dev
          </a>
        </div>
      </footer>
    </div>
  );
}
