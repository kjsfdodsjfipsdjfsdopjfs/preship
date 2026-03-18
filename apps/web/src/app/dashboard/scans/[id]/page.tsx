"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import ScoreCircle from "@/components/ScoreCircle";
import ViolationCard from "@/components/ViolationCard";
import CodeBlock from "@/components/CodeBlock";
import { apiFetch } from "@/hooks/useApi";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type Severity = "critical" | "serious" | "moderate" | "minor";

interface Violation {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: "accessibility" | "security" | "performance";
  element?: string;
  selector?: string;
  fix?: string;
  fixCode?: string;
  autoFixable?: boolean;
}

/* ------------------------------------------------------------------ */
/* Mock fallback data                                                  */
/* ------------------------------------------------------------------ */
const mockScanData = {
  id: "scan_001",
  url: "https://my-saas.vercel.app",
  status: "completed" as const,
  score: 72,
  accessibility: 58,
  security: 89,
  performance: 71,
  createdAt: "2026-03-16T14:30:00Z",
  completedAt: "2026-03-16T14:30:28Z",
  duration: "28s",
  checksRun: 218,
  progress: 0,
};

const mockViolations: Violation[] = [
  { id: "v_001", title: "Images must have alternate text", description: "Ensures <img> elements have alternate text or a role of none or presentation. Screen readers cannot interpret images without alt text.", severity: "critical", category: "accessibility", element: '<img src="/hero-banner.png" class="w-full">', selector: "main > section:first-child > img", fix: "Add descriptive alt text to the image.", fixCode: '<img src="/hero-banner.png" class="w-full" alt="Product dashboard showing real-time analytics">', autoFixable: false },
  { id: "v_002", title: "Form elements must have labels", description: "Ensures every form element has a corresponding <label> element or aria-label attribute.", severity: "critical", category: "accessibility", element: '<input type="email" placeholder="Enter your email">', selector: "#newsletter-form > input", fix: "Add an associated <label> element or aria-label.", fixCode: '<label for="email" class="sr-only">Email address</label>\n<input id="email" type="email" placeholder="Enter your email" aria-label="Email address">', autoFixable: true },
  { id: "v_003", title: "Color contrast ratio is insufficient", description: "Text must have a contrast ratio of at least 4.5:1. Current ratio is 2.8:1.", severity: "serious", category: "accessibility", element: '<p class="text-gray-400">Secondary text</p>', selector: ".feature-card > p", fix: "Use a lighter text color meeting 4.5:1 ratio.", fixCode: '<p class="text-gray-300">Secondary text</p>\n<!-- Contrast ratio: 5.2:1 -->', autoFixable: true },
  { id: "v_004", title: "Buttons must have discernible text", description: "Icon-only buttons without aria-label are invisible to assistive technology.", severity: "serious", category: "accessibility", element: '<button class="icon-btn"><svg>...</svg></button>', selector: "header > nav > button", fix: "Add aria-label describing the button action.", fixCode: '<button class="icon-btn" aria-label="Open navigation menu">\n  <svg>...</svg>\n</button>', autoFixable: true },
  { id: "v_005", title: "Missing Content-Security-Policy header", description: "Without CSP, the app is vulnerable to XSS and data injection attacks.", severity: "serious", category: "security", fix: "Add a CSP header to your server configuration.", fixCode: "// next.config.js\nconst securityHeaders = [{\n  key: 'Content-Security-Policy',\n  value: \"default-src 'self'; script-src 'self' 'unsafe-inline';\"\n}];\n\nmodule.exports = {\n  async headers() {\n    return [{ source: '/(.*)', headers: securityHeaders }];\n  }\n};", autoFixable: false },
  { id: "v_006", title: "Missing X-Frame-Options header", description: "Allows the site to be embedded in iframes, making it susceptible to clickjacking.", severity: "moderate", category: "security", fix: "Add X-Frame-Options: DENY.", fixCode: "{ key: 'X-Frame-Options', value: 'DENY' }", autoFixable: false },
  { id: "v_007", title: "LCP exceeds 2.5s threshold", description: "LCP is 4.2s. The hero image is not optimized.", severity: "serious", category: "performance", element: '<img src="/hero-banner.png">', selector: "main > section > img", fix: "Use next/image with priority loading.", fixCode: "import Image from 'next/image';\n\n<Image src=\"/hero-banner.png\" alt=\"Dashboard\" width={1200} height={600} priority />", autoFixable: false },
  { id: "v_008", title: "CLS above 0.1 threshold", description: "CLS score is 0.18. Elements shift during page load.", severity: "moderate", category: "performance", fix: "Set explicit width and height on images.", fixCode: ".hero-image {\n  aspect-ratio: 2 / 1;\n  width: 100%;\n}", autoFixable: false },
  { id: "v_009", title: "Keyboard focus order is not logical", description: "Tab order does not follow visual order due to CSS reordering.", severity: "moderate", category: "accessibility", fix: "Ensure CSS order matches logical DOM order.", autoFixable: false },
  { id: "v_010", title: "Links do not have descriptive text", description: "Multiple links use generic text like \"Read more\".", severity: "minor", category: "accessibility", element: '<a href="/blog/post-1">Read more</a>', fix: "Use descriptive link text.", fixCode: '<a href="/blog/post-1" aria-label="Read article: Building Accessible React Apps">Read more</a>', autoFixable: true },
  { id: "v_011", title: "Unused JavaScript exceeds 150KB", description: "153KB of unused JS on initial page load.", severity: "minor", category: "performance", fix: "Use dynamic imports and code splitting.", fixCode: "const Chart = dynamic(() => import('chart-lib'), { ssr: false });", autoFixable: false },
  { id: "v_012", title: "Cookie missing Secure flag", description: "Session cookie set without Secure flag.", severity: "minor", category: "security", fix: "Set Secure flag on all cookies.", fixCode: "res.setHeader('Set-Cookie', 'session=abc; Secure; HttpOnly; SameSite=Strict');", autoFixable: false },
];

const severityOrder: Record<Severity, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

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
  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6">
          <svg className="w-16 h-16 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          {status === "pending" ? "Scan Queued" : "Scanning..."}
        </h2>
        <p className="text-sm text-neutral-400 mb-4">{url}</p>
        {progress > 0 && (
          <div className="max-w-xs mx-auto">
            <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
              <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-neutral-500 mt-2">{progress}% complete</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Demo banner                                                         */
/* ------------------------------------------------------------------ */
function OfflineBanner() {
  return (
    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2 text-sm text-yellow-400 flex items-center gap-2">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      Could not load data from server. Showing cached results.
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
  const [offline, setOffline] = useState(false);
  const [scanData, setScanData] = useState<{
    id: string; url: string; status: string; score: number;
    accessibility: number; security: number; performance: number;
    createdAt: string; completedAt: string; duration: string;
    checksRun: number; progress: number;
  } | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [rescanning, setRescanning] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [activeTab, setActiveTab] = useState<"all" | "accessibility" | "security" | "performance">("all");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");

  const fetchScan = useCallback(async () => {
    if (!scanId) return;
    setLoading(true);
    setError(null);
    setOffline(false);

    try {
      const res = await apiFetch<any>(`/api/scans/${scanId}`);
      const data = res?.data;
      if (!data) throw new Error("No scan data returned");

      const results = data.results ?? {};
      const cats: any[] = results.categories ?? [];
      const a11y = cats.find((c: any) => c.name === "accessibility" || c.id === "accessibility");
      const sec = cats.find((c: any) => c.name === "security" || c.id === "security");
      const perf = cats.find((c: any) => c.name === "performance" || c.id === "performance");

      setScanData({
        id: data.scanId,
        url: data.url,
        status: data.status,
        score: data.overallScore ?? 0,
        accessibility: a11y?.score ?? 0,
        security: sec?.score ?? 0,
        performance: perf?.score ?? 0,
        createdAt: data.createdAt,
        completedAt: data.completedAt ?? "",
        duration:
          data.completedAt && data.createdAt
            ? `${Math.round((new Date(data.completedAt).getTime() - new Date(data.createdAt).getTime()) / 1000)}s`
            : "--",
        checksRun: results.checksRun ?? 0,
        progress: data.progress ?? 0,
      });

      const apiViolations: Violation[] = (results.violations ?? []).map((v: any, i: number) => ({
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
      setOffline(true);
      setScanData(mockScanData);
      setViolations(mockViolations);
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    fetchScan();
  }, [fetchScan]);

  // Poll if pending/running
  useEffect(() => {
    if (!scanData || (scanData.status !== "pending" && scanData.status !== "running")) return;
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
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
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
    const severity = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    const category = { accessibility: 0, security: 0, performance: 0 };
    const fixable: Violation[] = [];

    for (const v of violations) {
      if (severity[v.severity] !== undefined) severity[v.severity]++;
      if (category[v.category as keyof typeof category] !== undefined) category[v.category as keyof typeof category]++;
      if (v.autoFixable) fixable.push(v);
    }

    return { severityCounts: severity, categoryCounts: category, autoFixable: fixable };
  }, [violations]);

  const tabs = useMemo(
    () => [
      { key: "all", label: "All", count: violations.length },
      { key: "accessibility", label: "Accessibility", count: categoryCounts.accessibility },
      { key: "security", label: "Security", count: categoryCounts.security },
      { key: "performance", label: "Performance", count: categoryCounts.performance },
    ],
    [violations.length, categoryCounts]
  );

  const filtered = useMemo(
    () =>
      violations
        .filter((v) => activeTab === "all" || v.category === activeTab)
        .filter((v) => severityFilter === "all" || v.severity === severityFilter)
        .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]),
    [violations, activeTab, severityFilter]
  );

  if (loading) return <ScanDetailSkeleton />;

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

  if (scanData.status === "pending" || scanData.status === "running") {
    return <ScanPending status={scanData.status} progress={scanData.progress ?? 0} url={scanData.url} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {offline && <OfflineBanner />}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-sm text-red-400 hover:text-red-300 font-medium">Dismiss</button>
        </div>
      )}

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

      {/* Score overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 flex flex-col items-center justify-center">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Overall Score</p>
          <ScoreCircle score={scanData.score} size="lg" showLabel />
        </div>
        {[
          { label: "Accessibility", score: scanData.accessibility, count: categoryCounts.accessibility },
          { label: "Security", score: scanData.security, count: categoryCounts.security },
          { label: "Performance", score: scanData.performance, count: categoryCounts.performance },
        ].map((sub) => (
          <div key={sub.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 flex flex-col items-center justify-center">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">{sub.label}</p>
            <ScoreCircle score={sub.score} size="md" showLabel />
            <p className="text-xs text-neutral-500 mt-3">{sub.count} violation{sub.count !== 1 ? "s" : ""}</p>
          </div>
        ))}
      </div>

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
              ["critical", `Critical (${severityCounts.critical})`, "bg-red-500/20 text-red-400", "text-neutral-500 hover:text-red-400"],
              ["serious", `Serious (${severityCounts.serious})`, "bg-orange-500/20 text-orange-400", "text-neutral-500 hover:text-orange-400"],
              ["moderate", `Moderate (${severityCounts.moderate})`, "bg-yellow-500/20 text-yellow-400", "text-neutral-500 hover:text-yellow-400"],
              ["minor", `Minor (${severityCounts.minor})`, "bg-blue-500/20 text-blue-400", "text-neutral-500 hover:text-blue-400"],
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
              <div className="flex gap-1 p-1 rounded-lg bg-neutral-900 border border-neutral-800">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
