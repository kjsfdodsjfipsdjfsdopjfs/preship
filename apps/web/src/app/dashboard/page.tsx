"use client";

import { useState } from "react";
import StatsCard from "@/components/StatsCard";
import ScanCard from "@/components/ScanCard";
import Button from "@/components/Button";
import ScoreCircle from "@/components/ScoreCircle";

/* ------------------------------------------------------------------ */
/* Mock data                                                           */
/* ------------------------------------------------------------------ */
const stats = [
  {
    label: "Total Scans",
    value: "1,247",
    trend: { value: 12, positive: true },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: "Average Score",
    value: "74",
    trend: { value: 5, positive: true },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    label: "Issues Found",
    value: "3,892",
    trend: { value: 8, positive: false },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    label: "Issues Fixed",
    value: "2,156",
    trend: { value: 23, positive: true },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
];

const recentScans = [
  { id: "scan_001", url: "https://my-saas.vercel.app", score: 82, date: "2026-03-16T14:30:00Z", status: "completed" as const, violations: 12 },
  { id: "scan_002", url: "https://portfolio.dev", score: 45, date: "2026-03-16T12:15:00Z", status: "completed" as const, violations: 34 },
  { id: "scan_003", url: "https://shop.example.com", score: 91, date: "2026-03-15T18:00:00Z", status: "completed" as const, violations: 3 },
  { id: "scan_004", url: "https://blog.johndoe.com", score: 67, date: "2026-03-15T10:45:00Z", status: "completed" as const, violations: 18 },
  { id: "scan_005", url: "https://app.startup.io", score: 23, date: "2026-03-14T22:00:00Z", status: "completed" as const, violations: 57 },
];

const trendData = [
  { date: "Mar 1", score: 62 },
  { date: "Mar 3", score: 58 },
  { date: "Mar 5", score: 65 },
  { date: "Mar 7", score: 61 },
  { date: "Mar 9", score: 70 },
  { date: "Mar 11", score: 68 },
  { date: "Mar 13", score: 74 },
  { date: "Mar 15", score: 78 },
  { date: "Mar 16", score: 74 },
];

/* ------------------------------------------------------------------ */
/* Simple SVG line chart                                               */
/* ------------------------------------------------------------------ */
function TrendChart({ data }: { data: { date: string; score: number }[] }) {
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
/* Dashboard Page                                                      */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const [scanUrl, setScanUrl] = useState("");

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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
            className="w-64 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          />
          <Button>Scan</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
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
          <ScoreCircle score={74} size="lg" showLabel />
          <div className="mt-6 grid grid-cols-3 gap-4 w-full">
            <div className="text-center">
              <ScoreCircle score={68} size="sm" />
              <p className="text-xs text-neutral-500 mt-2">A11y</p>
            </div>
            <div className="text-center">
              <ScoreCircle score={85} size="sm" />
              <p className="text-xs text-neutral-500 mt-2">Security</p>
            </div>
            <div className="text-center">
              <ScoreCircle score={71} size="sm" />
              <p className="text-xs text-neutral-500 mt-2">Perf</p>
            </div>
          </div>
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
          {recentScans.map((scan) => (
            <ScanCard key={scan.id} {...scan} />
          ))}
        </div>
      </div>
    </div>
  );
}
