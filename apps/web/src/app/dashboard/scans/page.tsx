"use client";

import { useState } from "react";
import ScanCard from "@/components/ScanCard";
import Button from "@/components/Button";

const allScans = [
  { id: "scan_001", url: "https://my-saas.vercel.app", score: 82, date: "2026-03-16T14:30:00Z", status: "completed" as const, violations: 12 },
  { id: "scan_002", url: "https://portfolio.dev", score: 45, date: "2026-03-16T12:15:00Z", status: "completed" as const, violations: 34 },
  { id: "scan_003", url: "https://shop.example.com", score: 91, date: "2026-03-15T18:00:00Z", status: "completed" as const, violations: 3 },
  { id: "scan_004", url: "https://blog.johndoe.com", score: 67, date: "2026-03-15T10:45:00Z", status: "completed" as const, violations: 18 },
  { id: "scan_005", url: "https://app.startup.io", score: 23, date: "2026-03-14T22:00:00Z", status: "completed" as const, violations: 57 },
  { id: "scan_006", url: "https://docs.internal.co", score: 78, date: "2026-03-14T09:20:00Z", status: "completed" as const, violations: 9 },
  { id: "scan_007", url: "https://landing.newproduct.com", score: 55, date: "2026-03-13T16:00:00Z", status: "completed" as const, violations: 27 },
  { id: "scan_008", url: "https://admin.dashboard.io", score: 88, date: "2026-03-13T11:30:00Z", status: "completed" as const, violations: 5 },
  { id: "scan_009", url: "https://my-saas.vercel.app", score: 71, date: "2026-03-12T14:00:00Z", status: "completed" as const, violations: 16 },
  { id: "scan_010", url: "https://portfolio.dev", score: 39, date: "2026-03-11T08:45:00Z", status: "completed" as const, violations: 41 },
];

export default function ScansPage() {
  const [filter, setFilter] = useState<"all" | "completed" | "failed">("all");
  const [scanUrl, setScanUrl] = useState("");

  const filtered = filter === "all" ? allScans : allScans.filter((s) => s.status === filter);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">All Scans</h1>
          <p className="text-sm text-neutral-400 mt-1">{allScans.length} scans total</p>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://your-app.com"
            value={scanUrl}
            onChange={(e) => setScanUrl(e.target.value)}
            className="w-64 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          />
          <Button>New Scan</Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "completed", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === f
                ? "bg-neutral-700 text-white"
                : "text-neutral-500 hover:text-white hover:bg-neutral-800"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="space-y-2">
          {filtered.length > 0 ? (
            filtered.map((scan) => <ScanCard key={scan.id} {...scan} />)
          ) : (
            <div className="text-center py-12 text-neutral-500">No scans match the current filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}
