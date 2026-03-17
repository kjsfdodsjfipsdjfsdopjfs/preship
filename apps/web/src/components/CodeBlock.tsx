"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  copyable?: boolean;
  className?: string;
  title?: string;
}

export default function CodeBlock({ code, language = "text", copyable = false, className, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("rounded-lg border border-neutral-800 bg-[#0D1117] overflow-hidden", className)}>
      {(title || copyable) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-2">
            {title && <span className="text-xs text-neutral-300">{title}</span>}
            <span className="text-xs text-neutral-400">{language}</span>
          </div>
          {copyable && (
            <button onClick={handleCopy} className="text-xs text-neutral-300 hover:text-white transition-colors flex items-center gap-1" aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}>
              {copied ? (
                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
              )}
            </button>
          )}
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-neutral-300 leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}
