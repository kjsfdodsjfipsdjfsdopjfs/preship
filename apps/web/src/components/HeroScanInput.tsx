"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { API_BASE } from "@/hooks/useApi";

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function HeroScanInput() {
  const [scanUrl, setScanUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!scanUrl.trim()) {
      setError("Please enter a URL to scan.");
      return;
    }

    // Normalize URL: accept with/without protocol, with/without www
    let normalizedUrl = scanUrl.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    if (!isValidUrl(normalizedUrl)) {
      setError("Please enter a valid URL (e.g. https://your-app.vercel.app).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/scan/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setError(data.message || data.error || "Rate limit reached. Sign up for more scans.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Couldn't start scan. Try again.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const scanId = data.scanId || data.data?.scanId || data.id || data.data?.id;
      router.push(`/results/${scanId}`);
    } catch {
      setError("Couldn't start scan. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-10 max-w-xl mx-auto animate-slide-up animate-delay-200">
      <form onSubmit={handleSubmit} role="search" aria-label="Scan a URL">
        <label htmlFor="scan-url" className="sr-only">Enter your website URL to scan</label>
        <div className="flex gap-2 p-1.5 rounded-xl border border-neutral-800 bg-neutral-900">
          <input
            id="scan-url"
            type="text"
            placeholder="https://your-app.vercel.app"
            value={scanUrl}
            onChange={(e) => { setScanUrl(e.target.value); setError(""); }}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-neutral-400 focus:outline-none"
            aria-describedby={error ? "scan-error" : "scan-help"}
            disabled={loading}
          />
          <Button size="lg" className="whitespace-nowrap px-6" type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scanning...
              </span>
            ) : (
              "Scan your app free"
            )}
          </Button>
        </div>
      </form>
      {error ? (
        <p id="scan-error" role="alert" className="mt-3 text-xs text-red-400">
          {error}
        </p>
      ) : (
        <p id="scan-help" className="mt-3 text-xs text-neutral-400">
          Free. No sign-up required. Results in 30 seconds.
        </p>
      )}
    </div>
  );
}
