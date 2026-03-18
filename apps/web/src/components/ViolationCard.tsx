"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Badge from "./Badge";
import CodeBlock from "./CodeBlock";

type Severity = "critical" | "high" | "serious" | "medium" | "moderate" | "low" | "minor" | "info";

const severityColors: Record<string, string> = {
  critical: "text-red-400",
  high: "text-red-400",
  serious: "text-orange-400",
  medium: "text-yellow-400",
  moderate: "text-yellow-400",
  low: "text-blue-400",
  minor: "text-blue-400",
  info: "text-neutral-400",
};

interface Violation {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  element?: string;
  selector?: string;
  fix?: string;
  fixCode?: string;
}

interface ViolationCardProps {
  violation: Violation;
  className?: string;
}

export default function ViolationCard({ violation, className }: ViolationCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden transition-all duration-200", expanded && "border-neutral-700", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-800 transition-colors"
      >
        <div className={cn("flex-shrink-0", severityColors[violation.severity])}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{violation.title}</p>
          {violation.selector && <p className="text-xs text-neutral-500 font-mono truncate mt-0.5">{violation.selector}</p>}
        </div>
        <Badge variant={violation.severity}>{violation.severity}</Badge>
        <svg className={cn("w-4 h-4 text-neutral-500 transition-transform flex-shrink-0", expanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in">
          <p className="text-sm text-neutral-300">{violation.description}</p>
          {violation.element && (
            <div>
              <p className="text-xs font-medium text-neutral-400 mb-1">Affected Element</p>
              <CodeBlock code={violation.element} language="html" />
            </div>
          )}
          {violation.fix && (
            <div>
              <p className="text-xs font-medium text-neutral-400 mb-1">Suggested Fix</p>
              <p className="text-sm text-neutral-300">{violation.fix}</p>
            </div>
          )}
          {violation.fixCode && (
            <div>
              <p className="text-xs font-medium text-neutral-400 mb-1">Fix Code</p>
              <CodeBlock code={violation.fixCode} language="html" copyable />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
