"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { apiFetch } from "./useApi";
import type {
  ScanResult,
  ScanStatus,
} from "@preship/shared";

/**
 * Extended scan result from the API that may include
 * polling-phase fields before the scan is complete.
 */
interface ScanPollResult {
  id: string;
  url: string;
  status: ScanStatus;
  overallScore?: number;
  categories?: ScanResult["categories"];
  violations?: ScanResult["violations"];
  suggestions?: ScanResult["suggestions"];
  pagesScanned?: number;
  duration?: number;
  createdAt: string;
  completedAt?: string;
  /** Progress percentage during polling (0-100) */
  progress?: number;
  /** URL to the full report (returned by API after completion) */
  reportUrl?: string;
}

export function useScan() {
  const [scan, setScan] = useState<ScanPollResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const pollStatus = useCallback((scanId: string) => {
    stopPolling();
    const poll = async () => {
      try {
        const result = await apiFetch<ScanPollResult>(`/api/v1/scans/${scanId}`);
        setScan(result);
        if (result.status === "completed" || result.status === "failed") { stopPolling(); setLoading(false); }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Polling failed");
        stopPolling();
        setLoading(false);
      }
    };
    poll();
    intervalRef.current = setInterval(poll, 3000);
  }, [stopPolling]);

  const startScan = useCallback(async (url: string): Promise<ScanPollResult> => {
    setLoading(true); setError(null); setScan(null);
    try {
      const result = await apiFetch<ScanPollResult>("/api/v1/scans", { method: "POST", body: { url } });
      setScan(result);
      pollStatus(result.id);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scan failed";
      setError(message); setLoading(false); throw err;
    }
  }, [pollStatus]);

  useEffect(() => { return () => stopPolling(); }, [stopPolling]);

  return { scan, loading, error, startScan, pollStatus, stopPolling };
}

export default useScan;
