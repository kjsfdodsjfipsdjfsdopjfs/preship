"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";

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
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!scanUrl.trim()) {
      setError("Please enter a URL to scan.");
      return;
    }

    if (!isValidUrl(scanUrl.trim())) {
      setError("Please enter a valid URL (e.g. https://your-app.vercel.app).");
      return;
    }

    const encoded = encodeURIComponent(scanUrl.trim());
    const token = localStorage.getItem("auth_token");

    if (token) {
      router.push(`/dashboard/scans?newScan=${encoded}`);
    } else {
      router.push(`/signup?redirect=${encodeURIComponent(`/dashboard/scans?newScan=${encoded}`)}`);
    }
  }

  return (
    <div className="mt-10 max-w-xl mx-auto animate-slide-up animate-delay-200">
      <form onSubmit={handleSubmit} role="search" aria-label="Scan a URL">
        <label htmlFor="scan-url" className="sr-only">Enter your website URL to scan</label>
        <div className="flex gap-2 p-1.5 rounded-xl border border-neutral-800 bg-neutral-900">
          <input
            id="scan-url"
            type="url"
            placeholder="https://your-app.vercel.app"
            value={scanUrl}
            onChange={(e) => { setScanUrl(e.target.value); setError(""); }}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-neutral-400 focus:outline-none"
            aria-describedby={error ? "scan-error" : "scan-help"}
          />
          <Button size="lg" className="whitespace-nowrap px-6" type="submit">
            Scan your app free
          </Button>
        </div>
      </form>
      {error ? (
        <p id="scan-error" role="alert" className="mt-3 text-xs text-red-400">
          {error}
        </p>
      ) : (
        <p id="scan-help" className="mt-3 text-xs text-neutral-400">
          No sign-up required for your first scan. Takes ~30 seconds.
        </p>
      )}
    </div>
  );
}
