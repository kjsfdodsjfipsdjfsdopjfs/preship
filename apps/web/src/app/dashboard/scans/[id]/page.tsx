"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import ScoreCircle from "@/components/ScoreCircle";
import ViolationCard from "@/components/ViolationCard";
import CodeBlock from "@/components/CodeBlock";
import { apiFetch, API_BASE } from "@/hooks/useApi";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type Severity = "critical" | "high" | "serious" | "medium" | "moderate" | "low" | "minor" | "info";

type ShipReadiness = "SHIP IT" | "ALMOST READY" | "NEEDS WORK" | "DO NOT SHIP";

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

interface Violation {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: string;
  element?: string;
  selector?: string;
  fix?: string;
  fixCode?: string;
  autoFixable?: boolean;
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

function getScoreStrokeColorInline(score: number): string {
  if (score >= 90) return "#16A34A";
  if (score >= 70) return "#22C55E";
  if (score >= 50) return "#EAB308";
  return "#EF4444";
}

const PILLAR_CONFIG: Record<string, { icon: string; label: string; categories: string[] }> = {
  technical: { icon: "\uD83D\uDCCA", label: "Technical Reality", categories: ["accessibility", "security", "performance", "seo", "privacy", "mobile"] },
  product: { icon: "\uD83C\uDFA8", label: "Product Reality", categories: ["ux", "design", "human_appeal"] },
  business: { icon: "\uD83D\uDCB0", label: "Business Reality", categories: ["business", "revenue", "growth"] },
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

const severityOrder: Record<string, number> = { critical: 0, high: 0, serious: 1, medium: 1, moderate: 2, low: 2, minor: 3, info: 3 };

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function ScanDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-7 w-48 bg-neutral-800 rounded mb-2" />
          <div className="h-4 w-72 bg-neutral-800 rounded" />
          <div className="h-3 w-40 bg-neutral-800 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-neutral-800 rounded-lg" />
          <div className="h-10 w-24 bg-neutral-800 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-40" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-12 bg-neutral-800 rounded-lg" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-neutral-800 rounded-lg" />
          ))}
        </div>
        <div className="h-96 bg-neutral-800 rounded-xl" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pending/running state                                               */
/* ------------------------------------------------------------------ */
function ScanPending({ status, progress, url }: { status: string; progress: number; url: string }) {
  const isQueued = status === "pending" || status === "queued";
  const steps = [
    { label: "Queued", done: true },
    { label: "Loading page", done: !isQueued },
    { label: "Accessibility checks", done: progress > 30 },
    { label: "Security checks", done: progress > 60 },
    { label: "Performance checks", done: progress > 80 },
    { label: "Generating report", done: progress > 95 },
  ];
  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-10">
        {/* Animated radar/pulse effect */}
        <div className="flex justify-center mb-8">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-2 border-orange-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-orange-500/30 animate-ping" style={{ animationDelay: "0.5s" }} />
            <div className="absolute inset-4 rounded-full border-2 border-orange-500/40 animate-ping" style={{ animationDelay: "1s" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-orange-500 animate-spin" style={{ animationDuration: "3s" }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-1">
          {isQueued ? "Scan Queued" : "Scanning in progress..."}
        </h2>
        <p className="text-sm text-neutral-500 text-center mb-8 truncate">{url}</p>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(isQueued ? 5 : 15, progress)}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2 text-center tabular-nums">
            {progress > 0 ? `${progress}%` : isQueued ? "Waiting..." : "Starting..."}
          </p>
        </div>

        {/* Step checklist */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {step.done ? (
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : i === steps.findIndex(s => !s.done) ? (
                <svg className="w-5 h-5 text-orange-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <div className="w-5 h-5 rounded-full border border-neutral-700 flex-shrink-0" />
              )}
              <span className={`text-sm ${step.done ? "text-neutral-300" : i === steps.findIndex(s => !s.done) ? "text-white font-medium" : "text-neutral-600"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-neutral-600 text-center mt-8">
          This usually takes 15-30 seconds. Page will update automatically.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error banner                                                        */
/* ------------------------------------------------------------------ */
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-red-400">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {message}
      </div>
      <button onClick={onRetry} className="text-sm text-red-400 hover:text-red-300 font-medium">
        Retry
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scan Detail Page                                                    */
/* ------------------------------------------------------------------ */
export default function ScanDetailPage() {
  const params = useParams();
  const scanId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanData, setScanData] = useState<{
    id: string; url: string; status: string; score: number;
    shipReadiness: ShipReadiness;
    pillars: PillarScore[];
    categories: CategoryScore[];
    accessibility: number; security: number; performance: number;
    createdAt: string; completedAt: string; duration: string;
    checksRun: number; progress: number;
  } | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [rescanning, setRescanning] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");

  const fetchScan = useCallback(async () => {
    if (!scanId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch<any>(`/api/scans/${scanId}`);
      const data = res?.data;
      if (!data) throw new Error("No scan data returned");

      const cats: CategoryScore[] = (data.categories ?? data.results?.categories ?? []).map((c: any) => ({
        category: c.category,
        score: c.score ?? 0,
        violations: c.violations ?? 0,
        passed: c.passed ?? 0,
      }));
      const a11y = cats.find((c) => c.category === "accessibility");
      const sec = cats.find((c) => c.category === "security");
      const perf = cats.find((c) => c.category === "performance");

      const overallScore = data.overallScore ?? 0;
      const apiPillars: PillarScore[] = data.pillars ?? [];

      // Build pillars from categories if API doesn't provide them
      const pillars: PillarScore[] = apiPillars.length > 0
        ? apiPillars
        : (() => {
            const built: PillarScore[] = [];
            for (const [key, conf] of Object.entries(PILLAR_CONFIG)) {
              const pillarCats = cats.filter((c) => conf.categories.includes(c.category));
              if (pillarCats.length > 0) {
                const avg = Math.round(pillarCats.reduce((s, c) => s + c.score, 0) / pillarCats.length);
                built.push({ pillar: key, score: avg, categories: pillarCats });
              }
            }
            return built;
          })();

      setScanData({
        id: data.scanId,
        url: data.url,
        status: data.status,
        score: overallScore,
        shipReadiness: data.shipReadiness ?? computeShipReadiness(overallScore),
        pillars,
        categories: cats,
        accessibility: a11y?.score ?? 0,
        security: sec?.score ?? 0,
        performance: perf?.score ?? 0,
        createdAt: data.createdAt,
        completedAt: data.completedAt ?? "",
        duration: data.duration
          ? `${Math.round(data.duration / 1000)}s`
          : data.completedAt && data.createdAt
            ? `${Math.round((new Date(data.completedAt).getTime() - new Date(data.createdAt).getTime()) / 1000)}s`
            : "--",
        checksRun: data.pagesScanned ?? 0,
        progress: data.progress ?? 0,
      });

      const rawViolations = data.violations ?? data.results?.violations ?? [];
      const apiViolations: Violation[] = rawViolations.map((v: any, i: number) => ({
        id: v.id ?? `v_${i}`,
        title: v.title ?? v.rule ?? "Unknown violation",
        description: v.description ?? v.message ?? "",
        severity: v.severity ?? "moderate",
        category: v.category ?? "accessibility",
        element: v.element ?? v.html,
        selector: v.selector ?? v.target,
        fix: v.fix ?? v.suggestion,
        fixCode: v.fixCode,
        autoFixable: v.autoFixable ?? false,
      }));
      setViolations(apiViolations);
    } catch {
      setError("Could not load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    fetchScan();
  }, [fetchScan]);

  // Poll if pending/running
  useEffect(() => {
    if (!scanData || !["pending", "running", "queued", "processing"].includes(scanData.status)) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch<any>(`/api/scans/${scanId}`);
        const data = res?.data;
        if (data?.status === "completed" || data?.status === "failed") {
          clearInterval(interval);
          fetchScan();
        } else {
          setScanData((prev) =>
            prev ? { ...prev, progress: data?.progress ?? prev.progress ?? 0, status: data?.status ?? prev.status } : prev
          );
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [scanData?.status, scanId, fetchScan]);

  const handleRescan = async () => {
    if (!scanData?.url) return;
    setRescanning(true);
    try {
      const res = await apiFetch<any>("/api/scans", {
        method: "POST",
        body: { url: scanData.url },
      });
      if (res?.data?.scanId) {
        window.location.href = `/dashboard/scans/${res.data.scanId}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start re-scan");
    } finally {
      setRescanning(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      // API_BASE imported at top of file
      const res = await fetch(`${API_BASE}/api/scans/${scanId}/report`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `preship-report-${scanId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const { severityCounts, categoryCounts, autoFixable } = useMemo(() => {
    const severity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const category: Record<string, number> = {};
    const fixable: Violation[] = [];

    for (const v of violations) {
      if (severity[v.severity] !== undefined) severity[v.severity]++;
      category[v.category] = (category[v.category] ?? 0) + 1;
      if (v.autoFixable) fixable.push(v);
    }

    return { severityCounts: severity, categoryCounts: category, autoFixable: fixable };
  }, [violations]);

  const tabs = useMemo(() => {
    const allTab = { key: "all", label: "All", count: violations.length };
    // Build tabs from categories that have violations
    const catTabs = Object.entries(categoryCounts)
      .filter(([, count]) => count > 0)
      .map(([cat, count]) => ({
        key: cat,
        label: ALL_CATEGORY_LABELS[cat] || cat,
        count,
      }));
    return [allTab, ...catTabs];
  }, [violations.length, categoryCounts]);

  const filtered = useMemo(
    () =>
      violations
        .filter((v) => activeTab === "all" || v.category === activeTab)
        .filter((v) => severityFilter === "all" || v.severity === severityFilter)
        .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]),
    [violations, activeTab, severityFilter]
  );

  if (loading) return <ScanDetailSkeleton />;

  if (error && !scanData) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <ErrorBanner message={error} onRetry={fetchScan} />
      </div>
    );
  }

  if (!scanData) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-12 text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Scan Not Found</h2>
          <p className="text-sm text-neutral-400 mb-4">The scan you are looking for does not exist or you do not have access.</p>
          <Button variant="outline" onClick={() => (window.location.href = "/dashboard/scans")}>
            Back to Scans
          </Button>
        </div>
      </div>
    );
  }

  if (["pending", "running", "queued", "processing"].includes(scanData.status)) {
    return <ScanPending status={scanData.status} progress={scanData.progress ?? 0} url={scanData.url} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {error && <ErrorBanner message={error} onRetry={fetchScan} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Scan Results</h1>
            <Badge variant={scanData.status === "completed" ? "success" : scanData.status === "failed" ? "critical" : "warning"}>
              {scanData.status.charAt(0).toUpperCase() + scanData.status.slice(1)}
            </Badge>
          </div>
          <p className="text-sm text-neutral-400">
            {scanData.url} &middot; {scanData.duration} &middot; {scanData.checksRun} checks
          </p>
          <p className="text-xs text-neutral-500 mt-1">{new Date(scanData.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPdf} loading={downloading} disabled={scanData.status !== "completed"}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Download PDF
          </Button>
          <Button onClick={handleRescan} loading={rescanning}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Re-scan
          </Button>
        </div>
      </div>

      {/* Ship Readiness + Overall Score */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 flex flex-col items-center justify-center">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Reality Score</p>
          <ScoreCircle score={scanData.score} size="lg" showLabel />
        </div>
        <div className={`flex-1 rounded-xl border p-6 flex flex-col items-center justify-center ${getShipReadinessBg(scanData.shipReadiness)}`}>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Reality Check Verdict</p>
          <span className="text-2xl mb-1">
            {scanData.shipReadiness === "SHIP IT" ? "\uD83D\uDE80" : scanData.shipReadiness === "ALMOST READY" ? "\u26A0\uFE0F" : scanData.shipReadiness === "NEEDS WORK" ? "\uD83D\uDEE0\uFE0F" : "\uD83D\uDED1"}
          </span>
          <span className="text-xl font-bold tracking-wide" style={{ color: getShipReadinessColor(scanData.shipReadiness) }}>
            {scanData.shipReadiness}
          </span>
        </div>
      </div>

      {/* Pillar Cards */}
      {scanData.pillars.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {scanData.pillars.map((p) => {
            const config = PILLAR_CONFIG[p.pillar];
            const pillarColor = getScoreStrokeColorInline(p.score);
            return (
              <div key={p.pillar} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{config?.icon || "\uD83D\uDCCA"}</span>
                  <span className="text-sm font-semibold text-white">{config?.label || p.pillar}</span>
                </div>
                <div className="text-3xl font-bold tabular-nums mb-4" style={{ color: pillarColor }}>{p.score}</div>
                <div className="space-y-2">
                  {p.categories.map((cat) => {
                    const catColor = getScoreStrokeColorInline(cat.score);
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
          })}
        </div>
      ) : (
        /* Legacy 3-category view */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Accessibility", score: scanData.accessibility, count: categoryCounts["accessibility"] ?? 0 },
            { label: "Security", score: scanData.security, count: categoryCounts["security"] ?? 0 },
            { label: "Performance", score: scanData.performance, count: categoryCounts["performance"] ?? 0 },
          ].map((sub) => (
            <div key={sub.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 flex flex-col items-center justify-center">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">{sub.label}</p>
              <ScoreCircle score={sub.score} size="md" showLabel />
              <p className="text-xs text-neutral-500 mt-3">{sub.count} violation{sub.count !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>
      )}

      {violations.length === 0 && scanData.status === "completed" ? (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No violations found</h3>
          <p className="text-sm text-neutral-400">Your site passed all checks. Great job!</p>
        </div>
      ) : (
        <>
          {/* Severity filter bar */}
          <div className="flex items-center gap-4 py-3 px-4 rounded-lg bg-neutral-900 border border-neutral-800 flex-wrap">
            <span className="text-sm text-neutral-400 mr-2">Severity:</span>
            {([
              ["all", `All (${violations.length})`, "bg-neutral-700 text-white", "text-neutral-500 hover:text-white"],
              ["critical", `Critical (${(severityCounts.critical ?? 0)})`, "bg-red-500/20 text-red-400", "text-neutral-500 hover:text-red-400"],
              ["high", `High (${(severityCounts.high ?? 0)})`, "bg-orange-500/20 text-orange-400", "text-neutral-500 hover:text-orange-400"],
              ["medium", `Medium (${(severityCounts.medium ?? 0)})`, "bg-yellow-500/20 text-yellow-400", "text-neutral-500 hover:text-yellow-400"],
              ["low", `Low (${(severityCounts.low ?? 0)})`, "bg-blue-500/20 text-blue-400", "text-neutral-500 hover:text-blue-400"],
            ] as [string, string, string, string][]).map(([key, label, activeClass, inactiveClass]) => (
              <button
                key={key}
                onClick={() => setSeverityFilter(key as Severity | "all")}
                className={`text-sm px-2 py-1 rounded transition-colors ${severityFilter === key ? activeClass : inactiveClass}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-1 p-1 rounded-lg bg-neutral-900 border border-neutral-800 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-shrink-0 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.key ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white"
                    }`}
                  >
                    {tab.label} <span className="ml-1.5 text-xs text-neutral-500">({tab.count})</span>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {filtered.length > 0 ? (
                  filtered.map((v) => <ViolationCard key={v.id} violation={v} />)
                ) : (
                  <div className="text-center py-12 text-neutral-500">No violations match the current filters.</div>
                )}
              </div>
            </div>

            {/* Fix suggestions panel */}
            <div className="space-y-4">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 sticky top-24">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <h3 className="text-base font-semibold text-white">Quick Fixes</h3>
                </div>
                <p className="text-sm text-neutral-400 mb-4">{autoFixable.length} violation{autoFixable.length !== 1 ? "s have" : " has"} auto-fixable suggestions</p>

                {autoFixable.length > 0 ? (
                  <div className="space-y-3">
                    {autoFixable.map((v) => (
                      <div key={v.id} className="p-3 rounded-lg border border-neutral-800 bg-neutral-800/50">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm text-white font-medium leading-tight">{v.title}</p>
                          <Badge variant={v.severity}>{v.severity}</Badge>
                        </div>
                        {v.fixCode && <CodeBlock code={v.fixCode} language="html" copyable />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">No auto-fixable violations found.</p>
                )}

                <div className="mt-6 pt-4 border-t border-neutral-800">
                  <h4 className="text-sm font-medium text-white mb-2">Summary</h4>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-neutral-400">Total violations</span><span className="text-white font-medium">{violations.length}</span></div>
                    <div className="flex justify-between"><span className="text-neutral-400">Auto-fixable</span><span className="text-green-400 font-medium">{autoFixable.length}</span></div>
                    <div className="flex justify-between"><span className="text-neutral-400">Manual review</span><span className="text-yellow-400 font-medium">{violations.length - autoFixable.length}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
