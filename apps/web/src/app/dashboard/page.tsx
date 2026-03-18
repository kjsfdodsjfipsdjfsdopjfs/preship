"use client";

import { useState, useEffect, useCallback } from "react";
import StatsCard from "@/components/StatsCard";
import ScanCard from "@/components/ScanCard";
import Button from "@/components/Button";
import ScoreCircle from "@/components/ScoreCircle";
import { apiFetch } from "@/hooks/useApi";

const statIcons = [
  <svg key="scans" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  <svg key="score" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  <svg key="issues" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  <svg key="projects" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
];

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 bg-neutral-800 rounded" />
          <div className="h-4 w-64 bg-neutral-800 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-64 bg-neutral-800 rounded-lg" />
          <div className="h-10 w-20 bg-neutral-800 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-64" />
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-64" />
      </div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="h-5 w-32 bg-neutral-800 rounded mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-neutral-800 rounded-lg mb-2" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Simple SVG line chart                                               */
/* ------------------------------------------------------------------ */
function TrendChart({ data }: { data: { date: string; score: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-[200px] text-neutral-500 text-sm">
        Not enough data to show a trend yet.
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minScore = Math.min(...data.map((d) => d.score)) - 5;
  const maxScore = Math.max(...data.map((d) => d.score)) + 5;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.score - minScore) / (maxScore - minScore)) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padding.top + chartH * (1 - pct);
        const val = Math.round(minScore + (maxScore - minScore) * pct);
        return (
          <g key={pct}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#2A2A2A" strokeWidth="1" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#737373">
              {val}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        if (i % 2 !== 0 && i !== data.length - 1) return null;
        return (
          <text key={d.date} x={points[i].x} y={height - 6} textAnchor="middle" className="text-[10px]" fill="#737373">
            {d.date}
          </text>
        );
      })}

      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#F97316" stroke="#0A0A0A" strokeWidth="2" />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Onboarding card (shown when user has 0 scans)                       */
/* ------------------------------------------------------------------ */
function OnboardingCard({ scanUrl, setScanUrl, onScan, scanning }: {
  scanUrl: string;
  setScanUrl: (v: string) => void;
  onScan: () => void;
  scanning: boolean;
}) {
  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Run your first scan</h2>
        <p className="text-neutral-400 mb-8 max-w-md mx-auto">
          Enter a URL to scan your app for accessibility, security, and performance issues. Results in under 30 seconds.
        </p>
        <div className="flex gap-2 max-w-lg mx-auto">
          <input
            type="url"
            placeholder="https://your-app.com"
            value={scanUrl}
            onChange={(e) => setScanUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onScan()}
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          />
          <Button onClick={onScan} loading={scanning} disabled={!scanUrl.trim()} size="lg">
            Scan
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-neutral-500 text-xs">
          {["200+ checks", "WCAG 2.2 AA", "OWASP Top 10", "Core Web Vitals"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {item}
            </span>
          ))}
        </div>
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
/* Dashboard Page                                                      */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const [scanUrl, setScanUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Data state
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [stats, setStats] = useState<{ label: string; value: string; icon?: React.ReactNode; trend?: { value: number; positive: boolean } }[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; score: number }[]>([]);
  const [avgScore, setAvgScore] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch scans and projects in parallel
      const [scansRes, projectsRes] = await Promise.all([
        apiFetch<any>("/api/scans?limit=5&sort=date"),
        apiFetch<any>("/api/projects?limit=1"),
      ]);

      const scans = scansRes?.data?.scans ?? [];
      const totalScans = scansRes?.data?.pagination?.total ?? 0;
      const totalProjects = projectsRes?.data?.pagination?.total ?? 0;

      setRecentScans(
        scans.map((s: any) => ({
          id: s.scanId,
          url: s.url,
          score: s.overallScore ?? 0,
          date: s.createdAt,
          status: s.status,
          ...(s.violationCount != null && s.violationCount > 0 ? { violations: s.violationCount } : {}),
        }))
      );

      // Calculate average score from recent scans
      const completedScans = scans.filter((s: any) => s.status === "completed");
      const avg = completedScans.length
        ? Math.round(completedScans.reduce((sum: number, s: any) => sum + (s.overallScore ?? 0), 0) / completedScans.length)
        : 0;
      setAvgScore(avg);

      // Build trend data from scans
      const trend = scans
        .filter((s: any) => s.status === "completed")
        .reverse()
        .map((s: any) => ({
          date: new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          score: s.overallScore ?? 0,
        }));
      setTrendData(trend);

      setStats([
        { label: "Total Scans", value: totalScans.toLocaleString(), icon: statIcons[0] },
        { label: "Average Score", value: avg > 0 ? String(avg) : "--", icon: statIcons[1] },
        { label: "Completed", value: String(completedScans.length), icon: statIcons[2] },
        { label: "Projects", value: String(totalProjects), icon: statIcons[3] },
      ]);
    } catch (err) {
      setError("Could not load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScan = async () => {
    if (!scanUrl.trim()) return;
    setScanning(true);
    try {
      const res = await apiFetch<any>("/api/scans", {
        method: "POST",
        body: { url: scanUrl },
      });
      // Navigate to the scan detail page
      if (res?.data?.scanId) {
        window.location.href = `/dashboard/scans/${res.data.scanId}`;
      } else {
        // Refresh data
        await fetchData();
        setScanUrl("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan");
    } finally {
      setScanning(false);
    }
  };

  if (loading) return <DashboardSkeleton />;

  if (error && recentScans.length === 0 && stats.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <ErrorBanner message={error} onRetry={fetchData} />
      </div>
    );
  }

  // Show onboarding flow when user has 0 scans
  const totalScansCount = stats.find((s) => s.label === "Total Scans");
  const hasNoScans = recentScans.length === 0 && totalScansCount?.value === "0";

  if (hasNoScans) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {error && <ErrorBanner message={error} onRetry={fetchData} />}
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-1">Welcome to PreShip</p>
        </div>
        <OnboardingCard scanUrl={scanUrl} setScanUrl={setScanUrl} onScan={handleScan} scanning={scanning} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-1">Overview of your scanning activity</p>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://your-app.com"
            value={scanUrl}
            onChange={(e) => setScanUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            className="w-64 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          />
          <Button onClick={handleScan} loading={scanning} disabled={!scanUrl.trim()}>
            Scan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat: any) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Score Trend</h2>
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <span className="w-3 h-0.5 bg-orange-500 rounded" />
              Average score
            </div>
          </div>
          <TrendChart data={trendData} />
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 flex flex-col items-center justify-center">
          <p className="text-sm text-neutral-400 mb-4">Current Average</p>
          <ScoreCircle score={avgScore} size="lg" showLabel />
          {avgScore === 0 && (
            <p className="text-xs text-neutral-500 mt-4">Complete a scan to see your score</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Scans</h2>
          <a href="/dashboard/scans" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
            View all
          </a>
        </div>
        <div className="space-y-2">
          {recentScans.map((scan: any) => (
            <ScanCard key={scan.id} {...scan} />
          ))}
        </div>
      </div>
    </div>
  );
}
