"use client";

import Button from "@/components/Button";
import Badge from "@/components/Badge";
import ScoreCircle from "@/components/ScoreCircle";
import ScanCard from "@/components/ScanCard";

const project = { id: "proj_001", name: "SaaS Dashboard", url: "https://my-saas.vercel.app", score: 82, createdAt: "2026-01-15", scanCount: 47 };

const scans = [
  { id: "scan_001", url: project.url, score: 82, date: "2026-03-16T14:30:00Z", status: "completed" as const, violations: 12 },
  { id: "scan_010", url: project.url, score: 78, date: "2026-03-14T10:00:00Z", status: "completed" as const, violations: 16 },
  { id: "scan_020", url: project.url, score: 74, date: "2026-03-12T09:00:00Z", status: "completed" as const, violations: 19 },
  { id: "scan_030", url: project.url, score: 70, date: "2026-03-10T11:00:00Z", status: "completed" as const, violations: 22 },
  { id: "scan_040", url: project.url, score: 65, date: "2026-03-08T15:00:00Z", status: "completed" as const, violations: 28 },
];

const historyData = [
  { date: "Feb 15", score: 52 }, { date: "Feb 22", score: 58 }, { date: "Mar 1", score: 62 },
  { date: "Mar 5", score: 65 }, { date: "Mar 8", score: 70 }, { date: "Mar 10", score: 74 },
  { date: "Mar 12", score: 74 }, { date: "Mar 14", score: 78 }, { date: "Mar 16", score: 82 },
];

function HistoryChart({ data }: { data: { date: string; score: number }[] }) {
  const w = 700, h = 220;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom;
  const minS = Math.min(...data.map(d => d.score)) - 5, maxS = Math.max(...data.map(d => d.score)) + 5;
  const pts = data.map((d, i) => ({ x: pad.left + (i / (data.length - 1)) * cw, y: pad.top + ch - ((d.score - minS) / (maxS - minS)) * ch }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${pad.top + ch} L ${pts[0].x} ${pad.top + ch} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs><linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22C55E" stopOpacity="0.15" /><stop offset="100%" stopColor="#22C55E" stopOpacity="0" /></linearGradient></defs>
      {[0, 0.25, 0.5, 0.75, 1].map(pct => { const y = pad.top + ch * (1 - pct); return (<g key={pct}><line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#2A2A2A" /><text x={pad.left - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#737373">{Math.round(minS + (maxS - minS) * pct)}</text></g>); })}
      {data.map((d, i) => i % 2 === 0 || i === data.length - 1 ? <text key={d.date} x={pts[i].x} y={h - 6} textAnchor="middle" className="text-[10px]" fill="#737373">{d.date}</text> : null)}
      <path d={area} fill="url(#histGrad)" />
      <path d={line} fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#22C55E" stroke="#0A0A0A" strokeWidth="2" />)}
    </svg>
  );
}

export default function ProjectDetailPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <ScoreCircle score={project.score} size="md" showLabel />
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-400 hover:text-orange-400 transition-colors">{project.url}</a>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="success">Active</Badge>
              <span className="text-xs text-neutral-500">{project.scanCount} scans</span>
              <span className="text-xs text-neutral-500">Created {project.createdAt}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Settings</Button>
          <Button>Scan Now</Button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Score History</h2>
        <HistoryChart data={historyData} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ score: 76, label: "Accessibility", detail: "8 violations" }, { score: 89, label: "Security", detail: "2 warnings" }, { score: 81, label: "Performance", detail: "2 issues" }].map((item) => (
          <div key={item.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-center">
            <ScoreCircle score={item.score} size="sm" />
            <p className="text-sm font-medium text-white mt-3">{item.label}</p>
            <p className="text-xs text-neutral-500 mt-1">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Scans</h2>
        <div className="space-y-2">{scans.map((scan) => <ScanCard key={scan.id} {...scan} />)}</div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Project Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Scan Schedule</label>
            <select className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>Manual only</option><option>Daily</option><option>Weekly</option><option>On deploy (via webhook)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Checks to Run</label>
            <div className="space-y-2">
              {["Accessibility", "Security", "Performance"].map((check) => (
                <label key={check} className="flex items-center gap-2 text-sm text-neutral-300">
                  <input type="checkbox" defaultChecked className="rounded border-neutral-700 bg-neutral-800 text-orange-500 focus:ring-orange-500" />
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
