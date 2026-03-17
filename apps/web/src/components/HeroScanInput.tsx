"use client";

import { useState } from "react";
import Button from "@/components/Button";

export default function HeroScanInput() {
  const [scanUrl, setScanUrl] = useState("");

  return (
    <div className="mt-10 max-w-xl mx-auto animate-slide-up animate-delay-200">
      <form onSubmit={(e) => e.preventDefault()} role="search" aria-label="Scan a URL">
        <label htmlFor="scan-url" className="sr-only">Enter your website URL to scan</label>
        <div className="flex gap-2 p-1.5 rounded-xl border border-neutral-800 bg-neutral-900">
          <input
            id="scan-url"
            type="url"
            placeholder="https://your-app.vercel.app"
            value={scanUrl}
            onChange={(e) => setScanUrl(e.target.value)}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-neutral-400 focus:outline-none"
            aria-describedby="scan-help"
          />
          <Button size="lg" className="whitespace-nowrap px-6" type="submit">
            Scan your app free
          </Button>
        </div>
      </form>
      <p id="scan-help" className="mt-3 text-xs text-neutral-400">
        No sign-up required for your first scan. Takes ~30 seconds.
      </p>
    </div>
  );
}
