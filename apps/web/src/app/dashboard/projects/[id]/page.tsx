"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import ScoreCircle from "@/components/ScoreCircle";
import ScanCard from "@/components/ScanCard";
import { apiFetch } from "@/hooks/useApi";

/* ------------------------------------------------------------------ */
/* Mock fallback data                                                  */
/* ------------------------------------------------------------------ */
const mockProject = {
  id: "proj_001",
  name: "SaaS Dashboard",
  url: "https://my-saas.vercel.app",
  score: 82,
  createdAt: "2026-01-15",
  scanCount: 47,
};

const mockScans = [
  { id: "scan_001", url: "https://my-saas.vercel.app", score: 82, date: "2026-03-16T14:30:00Z", status: "completed" as const, violations: 12 },
  { id: "scan_010", url: "https://my-saas.vercel.app", score: 78, date: "2026-03-14T10:00:00Z", status: "completed" as const, violations: 16 },
  { id: "scan_020", url: "https://my-saas.vercel.app", score: 74, date: "2026-03-12T09:00:00Z", status: "completed" as const, violations: 19 },
];

const mockHistory = [
  { date: "Feb 15", score: 52 },
  { date: "Feb 22", score: 58 },
  { date: "Mar 1", score: 62 },
  { date: "Mar 5", score: 65 },
  { date: "Mar 8", score: 70 },
  { date: "Mar 10", score: 74 },
  { date: "Mar 12", score: 74 },
  { date: "Mar 14", score: 78 },
  { date: "Mar 16", score: 82 },
];

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function ProjectDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-neutral-800 rounded-full" />
          <div>
            <div className="h-7 w-48 bg-neutral-800 rounded" />
            <div className="h-4 w-64 bg-neutral-800 rounded mt-2" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-neutral-800 rounded-lg" />
          <div className="h-10 w-28 bg-neutral-800 rounded-lg" />
        </div>
      </div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-64" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 h-32" />)}
      </div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-neutral-800 rounded-lg mb-2" />)}
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
/* History Chart                                                       */
/* ------------------------------------------------------------------ */
function HistoryChart({ data }: { data: { date: string; score: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-[220px] text-neutral-500 text-sm">
        Not enough scan history to display a chart yet.
      </div>
    );
  }

  const w = 700, h = 220;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom;
  const minS = Math.min(...data.map((d) => d.score)) - 5;
  const maxS = Math.max(...data.map((d) => d.score)) + 5;
  const pts = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * cw,
    y: pad.top + ch - ((d.score - minS) / (maxS - minS)) * ch,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${pad.top + ch} L ${pts[0].x} ${pad.top + ch} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = pad.top + ch * (1 - pct);
        return (
          <g key={pct}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#2A2A2A" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#737373">
              {Math.round(minS + (maxS - minS) * pct)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) =>
        i % 2 === 0 || i === data.length - 1 ? (
          <text key={d.date} x={pts[i].x} y={h - 6} textAnchor="middle" className="text-[10px]" fill="#737373">
            {d.date}
          </text>
        ) : null
      )}
      <path d={area} fill="url(#histGrad)" />
      <path d={line} fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#22C55E" stroke="#0A0A0A" strokeWidth="2" />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Project Detail Page                                                 */
/* ------------------------------------------------------------------ */
export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<{ date: string; score: number }[]>([]);
  const [scanning, setScanning] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    setOffline(false);

    try {
      // Fetch project and scans in parallel
      const [projectRes, scansRes, historyRes] = await Promise.all([
        apiFetch<any>(`/api/projects/${projectId}`),
        apiFetch<any>(`/api/scans?projectId=${projectId}&limit=10&sort=date`),
        apiFetch<any>(`/api/projects/${projectId}/history`).catch(() => null),
      ]);

      const p = projectRes?.data;
      if (!p) throw new Error("Project not found");

      setProject({
        id: p.id,
        name: p.name,
        url: p.url,
        score: p.latestScan?.overallScore ?? 0,
        createdAt: p.created_at,
        scanCount: p.scan_count ?? 0,
        schedule: p.schedule,
        checks: p.checks,
      });

      const apiScans = (scansRes?.data?.scans ?? []).map((s: any) => ({
        id: s.scanId,
        url: s.url,
        score: s.overallScore ?? 0,
        date: s.createdAt,
        status: s.status,
        violations: 0,
      }));
      setScans(apiScans);

      // Build history from history endpoint or from scans
      if (historyRes?.data?.history) {
        setHistoryData(
          historyRes.data.history
            .filter((h: any) => h.status === "completed")
            .map((h: any) => ({
              date: new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              score: h.overallScore ?? 0,
            }))
            .reverse()
        );
      } else {
        setHistoryData(
          apiScans
            .filter((s: any) => s.status === "completed")
            .reverse()
            .map((s: any) => ({
              date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              score: s.score,
            }))
        );
      }
    } catch {
      setOffline(true);
      setProject(mockProject);
      setScans(mockScans);
      setHistoryData(mockHistory);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScanNow = async () => {
    if (!project?.url) return;
    setScanning(true);
    try {
      const res = await apiFetch<any>("/api/scans", {
        method: "POST",
        body: { url: project.url, projectId },
      });
      if (res?.data?.scanId) {
        window.location.href = `/dashboard/scans/${res.data.scanId}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan");
    } finally {
      setScanning(false);
    }
  };

  if (loading) return <ProjectDetailSkeleton />;

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-12 text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Project Not Found</h2>
          <p className="text-sm text-neutral-400 mb-4">The project does not exist or you do not have access.</p>
          <Button variant="outline" onClick={() => (window.location.href = "/dashboard/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
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

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <ScoreCircle score={project.score} size="md" showLabel />
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-400 hover:text-orange-400 transition-colors">
              {project.url}
            </a>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="success">Active</Badge>
              <span className="text-xs text-neutral-500">{project.scanCount} scans</span>
              <span className="text-xs text-neutral-500">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => (window.location.href = `/dashboard/projects/${projectId}`)}>
            Settings
          </Button>
          <Button onClick={handleScanNow} loading={scanning}>
            Scan Now
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Score History</h2>
        <HistoryChart data={historyData} />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Scans</h2>
          <a href="/dashboard/scans" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
            View all
          </a>
        </div>
        {scans.length > 0 ? (
          <div className="space-y-2">
            {scans.map((scan) => (
              <ScanCard key={scan.id} {...scan} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-neutral-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-neutral-500 mb-4">No scans for this project yet.</p>
            <Button size="sm" onClick={handleScanNow} loading={scanning}>
              Run First Scan
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Project Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Scan Schedule</label>
            <select
              defaultValue={project.schedule || ""}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Manual only</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Checks to Run</label>
            <div className="space-y-2">
              {["Accessibility", "Security", "Performance"].map((check) => (
                <label key={check} className="flex items-center gap-2 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    defaultChecked={!project.checks || project.checks.includes(check.toLowerCase())}
                    className="rounded border-neutral-700 bg-neutral-800 text-orange-500 focus:ring-orange-500"
                  />
                  {check}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
