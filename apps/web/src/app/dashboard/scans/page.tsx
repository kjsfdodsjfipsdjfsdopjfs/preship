"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ScanCard from "@/components/ScanCard";
import Button from "@/components/Button";
import { apiFetch } from "@/hooks/useApi";

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function ScansSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-32 bg-neutral-800 rounded" />
          <div className="h-4 w-48 bg-neutral-800 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-64 bg-neutral-800 rounded-lg" />
          <div className="h-10 w-24 bg-neutral-800 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-8 w-24 bg-neutral-800 rounded-lg" />)}
      </div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 bg-neutral-800 rounded-lg mb-2" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
function EmptyState({ onScan }: { onScan: () => void }) {
  return (
    <div className="text-center py-16">
      <svg className="w-16 h-16 mx-auto text-neutral-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <h3 className="text-lg font-semibold text-white mb-2">No scans yet</h3>
      <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
        Run your first scan to start auditing your web application.
      </p>
      <Button onClick={onScan}>Run Your First Scan</Button>
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
/* Scans Page                                                          */
/* ------------------------------------------------------------------ */
export default function ScansPage() {
  const [filter, setFilter] = useState<"all" | "completed" | "failed" | "pending" | "running">("all");
  const [scanUrl, setScanUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scans, setScans] = useState<any[]>([]);
  const [totalScans, setTotalScans] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const searchParams = useSearchParams();
  const router = useRouter();
  const autoScanTriggered = useRef(false);

  const fetchScans = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch<any>(`/api/scans?page=${pageNum}&limit=20&sort=date`);
      const apiScans = (res?.data?.scans ?? []).map((s: any) => ({
        id: s.scanId,
        url: s.url,
        score: s.overallScore ?? 0,
        date: s.createdAt,
        status: s.status,
        ...(s.violationCount != null && s.violationCount > 0 ? { violations: s.violationCount } : {}),
      }));
      setScans(apiScans);
      setTotalScans(res?.data?.pagination?.total ?? 0);
      setTotalPages(res?.data?.pagination?.totalPages ?? 1);
      setPage(pageNum);
    } catch {
      setError("Could not load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  // Auto-trigger scan from newScan query param (e.g. from landing page hero)
  useEffect(() => {
    const newScanUrl = searchParams.get("newScan");
    if (newScanUrl && !autoScanTriggered.current) {
      autoScanTriggered.current = true;
      // Remove the param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("newScan");
      router.replace(url.pathname + url.search, { scroll: false });

      // Trigger the scan
      (async () => {
        setScanning(true);
        setError(null);
        try {
          const res = await apiFetch<any>("/api/scans", {
            method: "POST",
            body: { url: newScanUrl },
          });
          if (res?.data?.scanId) {
            window.location.href = `/dashboard/scans/${res.data.scanId}`;
          } else {
            await fetchScans();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to start scan");
        } finally {
          setScanning(false);
        }
      })();
    }
  }, [searchParams, router, fetchScans]);

  const handleNewScan = async () => {
    if (!scanUrl.trim()) return;
    setScanning(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/scans", {
        method: "POST",
        body: { url: scanUrl },
      });
      if (res?.data?.scanId) {
        window.location.href = `/dashboard/scans/${res.data.scanId}`;
      } else {
        setScanUrl("");
        await fetchScans();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan");
    } finally {
      setScanning(false);
    }
  };

  const filtered = filter === "all" ? scans : scans.filter((s) => s.status === filter);

  if (loading) return <ScansSkeleton />;

  if (error && scans.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <ErrorBanner message={error} onRetry={() => fetchScans(page)} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {error && <ErrorBanner message={error} onRetry={() => fetchScans(page)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">All Scans</h1>
          <p className="text-sm text-neutral-400 mt-1">{totalScans} scan{totalScans !== 1 ? "s" : ""} total</p>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://your-app.com"
            value={scanUrl}
            onChange={(e) => setScanUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNewScan()}
            className="w-64 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          />
          <Button onClick={handleNewScan} loading={scanning} disabled={!scanUrl.trim()}>
            New Scan
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "completed", "running", "pending", "failed"] as const).map((f) => (
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
        {scans.length === 0 ? (
          <EmptyState onScan={() => document.querySelector<HTMLInputElement>('input[type="url"]')?.focus()} />
        ) : filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((scan) => <ScanCard key={scan.id} {...scan} />)}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500">No scans match the current filter.</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => fetchScans(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-neutral-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => fetchScans(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
