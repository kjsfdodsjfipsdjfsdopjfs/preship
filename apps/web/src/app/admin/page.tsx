"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/hooks/useApi";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OverviewData {
  totalScans: number;
  organicScans: number;
  internalScans: number;
  todayScans: number;
  users: number;
  avgScore: number;
  completed: number;
  failed: number;
}

interface DailyPoint {
  date: string;
  organic: number;
  internal: number;
}

interface ScoreDistribution {
  excellent: number;
  good: number;
  needsWork: number;
  poor: number;
}

interface CategoryAverage {
  category: string;
  avgScore: number;
}

interface TopDomain {
  url: string;
  scans: number;
  avgScore: number;
  organic: number;
  internal: number;
  lastScanned: string;
}

interface RecentScan {
  url: string;
  score: number;
  source: "organic" | "api";
  status: "completed" | "failed" | "processing" | "queued";
  time: string;
}

interface UserRow {
  email: string;
  name: string;
  plan: string;
  scans: number;
  projects: number;
  joined: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 90) return "text-green-400";
  if (score >= 70) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 90) return "bg-green-400/10 text-green-400";
  if (score >= 70) return "bg-green-400/10 text-green-400";
  if (score >= 50) return "bg-yellow-400/10 text-yellow-400";
  return "bg-red-400/10 text-red-400";
}

function sourceBadge(source: "organic" | "api"): string {
  return source === "organic"
    ? "bg-green-500/10 text-green-400"
    : "bg-orange-500/10 text-orange-400";
}

function statusBadge(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-500/10 text-green-400";
    case "failed":
      return "bg-red-500/10 text-red-400";
    case "processing":
      return "bg-yellow-500/10 text-yellow-400";
    default:
      return "bg-neutral-500/10 text-neutral-400";
  }
}

function truncateUrl(url: string, max = 40): string {
  if (url.length <= max) return url;
  return url.slice(0, max) + "...";
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    const d = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return timeStr;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-neutral-800 bg-neutral-900 ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-neutral-800 px-6 py-4">
      <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
    </div>
  );
}

function KPICard({ value, label }: { value: string | number; label: string }) {
  return (
    <Card className="p-6">
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-neutral-500">{label}</div>
    </Card>
  );
}

// ─── Login ───────────────────────────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Invalid credentials");
      }
      const json = await res.json();
      const adminToken = json.data?.token || json.token;
      sessionStorage.setItem("admin_token", adminToken);
      onLogin(adminToken);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <div className="mb-2 text-2xl font-bold text-white">
            Pre<span className="text-[#F97316]">Ship</span>
          </div>
          <p className="text-sm text-neutral-500">Admin Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-800/50 px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-800/50 px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#F97316]/90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </Card>
    </div>
  );
}

// ─── Daily Chart (SVG) ──────────────────────────────────────────────────────

function DailyChart({ data }: { data: DailyPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-600">
        No data available
      </div>
    );
  }

  const W = 900;
  const H = 260;
  const PAD_LEFT = 50;
  const PAD_RIGHT = 20;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 40;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.organic, d.internal)),
    1
  );
  const yTicks = 5;
  const yStep = Math.ceil(maxVal / yTicks);
  const yMax = yStep * yTicks;

  function x(i: number) {
    return PAD_LEFT + (i / (data.length - 1 || 1)) * chartW;
  }
  function y(v: number) {
    return PAD_TOP + chartH - (v / yMax) * chartH;
  }

  function polyline(key: "organic" | "internal") {
    return data.map((d, i) => `${x(i)},${y(d[key])}`).join(" ");
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Y-axis grid + labels */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const val = yStep * i;
        const yy = y(val);
        return (
          <g key={`y-${i}`}>
            <line
              x1={PAD_LEFT}
              y1={yy}
              x2={W - PAD_RIGHT}
              y2={yy}
              stroke="#262626"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={yy + 4}
              fill="#737373"
              fontSize={11}
              textAnchor="end"
            >
              {val}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {data.map((d, i) => {
        if (data.length > 14 && i % Math.ceil(data.length / 7) !== 0) return null;
        return (
          <text
            key={`x-${i}`}
            x={x(i)}
            y={H - 8}
            fill="#737373"
            fontSize={10}
            textAnchor="middle"
          >
            {formatDate(d.date)}
          </text>
        );
      })}

      {/* Organic line (green) */}
      <polyline
        points={polyline("organic")}
        fill="none"
        stroke="#4ade80"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Internal line (orange) */}
      <polyline
        points={polyline("internal")}
        fill="none"
        stroke="#F97316"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Dots */}
      {data.map((d, i) => (
        <g key={`dots-${i}`}>
          <circle cx={x(i)} cy={y(d.organic)} r={2.5} fill="#4ade80" />
          <circle cx={x(i)} cy={y(d.internal)} r={2.5} fill="#F97316" />
        </g>
      ))}

      {/* Legend */}
      <circle cx={PAD_LEFT + 10} cy={PAD_TOP - 6} r={4} fill="#4ade80" />
      <text x={PAD_LEFT + 20} y={PAD_TOP - 2} fill="#a3a3a3" fontSize={11}>
        Organic
      </text>
      <circle cx={PAD_LEFT + 90} cy={PAD_TOP - 6} r={4} fill="#F97316" />
      <text x={PAD_LEFT + 100} y={PAD_TOP - 2} fill="#a3a3a3" fontSize={11}>
        Internal
      </text>
    </svg>
  );
}

// ─── Score Distribution (Horizontal Bars) ───────────────────────────────────

function ScoreDistributionChart({ data }: { data: ScoreDistribution }) {
  const items = [
    { label: "Excellent (90-100)", value: data.excellent, color: "bg-green-400" },
    { label: "Good (70-89)", value: data.good, color: "bg-green-500" },
    { label: "Needs Work (50-69)", value: data.needsWork, color: "bg-yellow-400" },
    { label: "Poor (0-49)", value: data.poor, color: "bg-red-400" },
  ];
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3 p-6">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-neutral-400">{item.label}</span>
            <span className="font-medium text-neutral-300">{item.value}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full rounded-full ${item.color}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Category Averages (Vertical Bars) ──────────────────────────────────────

function CategoryAveragesChart({ data }: { data: CategoryAverage[] }) {
  if (!data.length) return null;

  return (
    <div className="flex items-end gap-3 p-6 pt-2">
      {data.map((cat) => (
        <div key={cat.category} className="flex flex-1 flex-col items-center gap-2">
          <span className={`text-xs font-semibold ${scoreColor(cat.avgScore)}`}>
            {Math.round(cat.avgScore)}
          </span>
          <div className="relative h-32 w-full overflow-hidden rounded-t-md bg-neutral-800">
            <div
              className={`absolute bottom-0 w-full rounded-t-md ${
                cat.avgScore >= 70
                  ? "bg-green-400/80"
                  : cat.avgScore >= 50
                  ? "bg-yellow-400/80"
                  : "bg-red-400/80"
              }`}
              style={{ height: `${cat.avgScore}%` }}
            />
          </div>
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">
            {cat.category}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [distribution, setDistribution] = useState<ScoreDistribution | null>(null);
  const [categories, setCategories] = useState<CategoryAverage[]>([]);
  const [domains, setDomains] = useState<TopDomain[]>([]);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  // Check for existing token
  useEffect(() => {
    const stored = sessionStorage.getItem("admin_token");
    if (stored) setToken(stored);
  }, []);

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "X-Admin-Token": token || "",
    }),
    [token]
  );

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const h = headers();
      const [
        overviewRes,
        dailyRes,
        scoresRes,
        domainsRes,
        scansRes,
        usersRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/admin/overview`, { headers: h }),
        fetch(`${API_BASE}/api/admin/scans/daily`, { headers: h }),
        fetch(`${API_BASE}/api/admin/scores`, { headers: h }),
        fetch(`${API_BASE}/api/admin/domains`, { headers: h }),
        fetch(`${API_BASE}/api/admin/scans/recent`, { headers: h }),
        fetch(`${API_BASE}/api/admin/users`, { headers: h }),
      ]);

      // If any returns 401, clear token
      if (
        [overviewRes, dailyRes, scoresRes, domainsRes, scansRes, usersRes].some(
          (r) => r.status === 401
        )
      ) {
        sessionStorage.removeItem("admin_token");
        setToken(null);
        return;
      }

      const [overviewJson, dailyJson, scoresJson, domainsJson, scansJson, usersJson] =
        await Promise.all([
          overviewRes.json(),
          dailyRes.json(),
          scoresRes.json(),
          domainsRes.json(),
          scansRes.json(),
          usersRes.json(),
        ]);

      // Map API response fields to frontend types
      const ov = overviewJson.data;
      setOverview({
        totalScans: ov.totalScans,
        organicScans: ov.publicScans,
        internalScans: ov.apiScans,
        todayScans: ov.todayScans,
        users: ov.totalUsers,
        avgScore: ov.avgScore,
        completed: ov.completedScans,
        failed: ov.failedScans,
      });

      // Daily: API returns { day, total, organic, internal }
      setDaily(
        (dailyJson.data || []).map((d: any) => ({
          date: d.day,
          organic: d.organic || 0,
          internal: d.internal || 0,
        }))
      );

      // Scores: API returns { distribution: {...}, categoryAverages: [...] }
      const scoresData = scoresJson.data;
      setDistribution(scoresData.distribution);
      setCategories(scoresData.categoryAverages || []);

      // Domains: API returns { url, scanCount, avgScore, organicCount, internalCount, lastScanned }
      setDomains(
        (domainsJson.data || []).map((d: any) => ({
          url: d.url,
          scans: d.scanCount,
          avgScore: d.avgScore ?? 0,
          organic: d.organicCount,
          internal: d.internalCount,
          lastScanned: d.lastScanned,
        }))
      );

      // Recent scans: API returns { id, url, status, score, source, createdAt }
      setRecentScans(
        (scansJson.data || []).map((s: any) => ({
          url: s.url,
          score: s.score ?? 0,
          source: s.source,
          status: s.status,
          time: s.createdAt,
        }))
      );

      // Users: API returns { id, email, name, plan, scanCount, projectCount, createdAt }
      setUsers(
        (usersJson.data || []).map((u: any) => ({
          email: u.email,
          name: u.name,
          plan: u.plan,
          scans: u.scanCount,
          projects: u.projectCount,
          joined: u.createdAt,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, headers]);

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchAll();
    }
  }, [token, fetchAll]);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setToken(null);
  };

  // ─── Login gate ────────────────────────────────────────────────────────────

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-[#F97316]" />
          <p className="text-sm text-neutral-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-[#0A0A0A]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold">
            Pre<span className="text-[#F97316]">Ship</span>{" "}
            <span className="text-neutral-500 font-normal">Admin</span>
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAll}
              disabled={refreshing}
              className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-neutral-700 hover:text-white disabled:opacity-50"
            >
              {refreshing ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border border-neutral-600 border-t-[#F97316]" />
                  Refreshing
                </span>
              ) : (
                "Refresh"
              )}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-red-900 hover:text-red-400"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* ─── KPI Cards Row 1 ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            value={overview?.totalScans?.toLocaleString() ?? "—"}
            label="Total Scans"
          />
          <KPICard
            value={overview?.organicScans?.toLocaleString() ?? "—"}
            label="Organic Scans"
          />
          <KPICard
            value={overview?.internalScans?.toLocaleString() ?? "—"}
            label="Internal Scans"
          />
          <KPICard
            value={overview?.todayScans?.toLocaleString() ?? "—"}
            label="Today's Scans"
          />
        </div>

        {/* ─── KPI Cards Row 2 ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            value={overview?.users?.toLocaleString() ?? "—"}
            label="Users"
          />
          <KPICard
            value={overview?.avgScore != null ? Math.round(overview.avgScore) : "—"}
            label="Avg Score"
          />
          <KPICard
            value={overview?.completed?.toLocaleString() ?? "—"}
            label="Completed"
          />
          <KPICard
            value={overview?.failed?.toLocaleString() ?? "—"}
            label="Failed"
          />
        </div>

        {/* ─── Daily Scan Chart ─────────────────────────────────────────── */}
        <Card>
          <CardHeader title="Daily Scans (Last 30 Days)" />
          <div className="p-6">
            <DailyChart data={daily} />
          </div>
        </Card>

        {/* ─── Score Distribution + Category Averages ───────────────────── */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Score Distribution" />
            {distribution ? (
              <ScoreDistributionChart data={distribution} />
            ) : (
              <div className="flex h-48 items-center justify-center text-neutral-600">
                No data
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Category Averages" />
            {categories.length ? (
              <CategoryAveragesChart data={categories} />
            ) : (
              <div className="flex h-48 items-center justify-center text-neutral-600">
                No data
              </div>
            )}
          </Card>
        </div>

        {/* ─── Top Domains ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader title="Top Domains" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
                  <th className="px-6 py-3 font-medium">URL</th>
                  <th className="px-6 py-3 font-medium">Scans</th>
                  <th className="px-6 py-3 font-medium">Avg Score</th>
                  <th className="px-6 py-3 font-medium">Organic</th>
                  <th className="px-6 py-3 font-medium">Internal</th>
                  <th className="px-6 py-3 font-medium">Last Scanned</th>
                </tr>
              </thead>
              <tbody>
                {domains.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-neutral-600">
                      No domains yet
                    </td>
                  </tr>
                )}
                {domains.map((d, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-800/50 transition hover:bg-neutral-800/50"
                  >
                    <td className="px-6 py-3 font-mono text-xs text-neutral-300">
                      {d.url}
                    </td>
                    <td className="px-6 py-3 text-neutral-400">{d.scans}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreBg(d.avgScore)}`}
                      >
                        {Math.round(d.avgScore)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-neutral-400">{d.organic}</td>
                    <td className="px-6 py-3 text-neutral-400">{d.internal}</td>
                    <td className="px-6 py-3 text-xs text-neutral-500">
                      {formatTime(d.lastScanned)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ─── Recent Scans ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader title="Recent Scans" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
                  <th className="px-6 py-3 font-medium">URL</th>
                  <th className="px-6 py-3 font-medium">Score</th>
                  <th className="px-6 py-3 font-medium">Source</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-600">
                      No scans yet
                    </td>
                  </tr>
                )}
                {recentScans.map((s, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-800/50 transition hover:bg-neutral-800/50"
                  >
                    <td className="px-6 py-3 font-mono text-xs text-neutral-300">
                      {truncateUrl(s.url)}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`font-semibold ${scoreColor(s.score)}`}>
                        {s.score}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceBadge(s.source)}`}
                      >
                        {s.source}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(s.status)}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-neutral-500">
                      {formatTime(s.time)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ─── Users ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader title="Users" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-6 py-3 font-medium">Scans</th>
                  <th className="px-6 py-3 font-medium">Projects</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-neutral-600">
                      No users yet
                    </td>
                  </tr>
                )}
                {users.map((u, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-800/50 transition hover:bg-neutral-800/50"
                  >
                    <td className="px-6 py-3 text-neutral-300">{u.email}</td>
                    <td className="px-6 py-3 text-neutral-400">{u.name || "—"}</td>
                    <td className="px-6 py-3">
                      <span className="inline-block rounded-full bg-[#F97316]/10 px-2.5 py-0.5 text-xs font-medium text-[#F97316]">
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-neutral-400">{u.scans}</td>
                    <td className="px-6 py-3 text-neutral-400">{u.projects}</td>
                    <td className="px-6 py-3 text-xs text-neutral-500">
                      {formatDate(u.joined)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
