"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { API_BASE } from "@/hooks/useApi";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Violation {
  id: string;
  category: string;
  severity: string;
  rule: string;
  message: string;
  element?: string;
  selector?: string;
  url: string;
  help?: string;
  helpUrl?: string;
}

interface CategoryScore {
  category: string;
  score: number;
  violations: number;
  passed?: number;
}

interface ScanData {
  id: string;
  scanId?: string;
  url: string;
  status: string;
  overallScore: number;
  categories: CategoryScore[];
  violations: Violation[];
  suggestions?: { violationId: string; description: string; codeSnippet?: string }[];
  createdAt: string;
  completedAt?: string;
  previousScore?: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function getScoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 50) return "#EAB308";
  return "#EF4444";
}

function getLetterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function getPercentile(score: number): number {
  // Approximate percentile based on score distribution
  if (score >= 90) return 95;
  if (score >= 80) return 80;
  if (score >= 70) return 60;
  if (score >= 60) return 45;
  if (score >= 50) return 30;
  return 15;
}

function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("auth_token");
}

/* ------------------------------------------------------------------ */
/* Violation translator                                                */
/* ------------------------------------------------------------------ */
interface TranslatedViolation {
  emoji: string;
  title: string;
  description: string;
  category: string;
}

function translateViolation(v: Violation): TranslatedViolation {
  const emojiMap: Record<string, string> = {
    accessibility: "\u267F",
    security: "\uD83D\uDD12",
    performance: "\u26A1",
    seo: "\uD83D\uDD0D",
    privacy: "\uD83D\uDEE1\uFE0F",
    mobile: "\uD83D\uDCF1",
  };

  const severityPrefix: Record<string, string> = {
    critical: "Critical: ",
    high: "Important: ",
    medium: "",
    low: "",
    info: "",
  };

  // Build a human-readable title from the rule name
  const humanTitle = v.rule
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    emoji: emojiMap[v.category] || "\u2139\uFE0F",
    title: `${severityPrefix[v.severity] || ""}${humanTitle}`,
    description: v.message || v.help || "This issue may affect users of your site.",
    category: v.category,
  };
}

/* ------------------------------------------------------------------ */
/* Prompt generators                                                   */
/* ------------------------------------------------------------------ */
function generateFixPrompt(violations: Violation[], tool: "cursor" | "claude" | "v0", url: string): string {
  const header =
    tool === "cursor"
      ? `I scanned ${url} with PreShip and found these issues. Fix them:\n\n`
      : tool === "claude"
        ? `I ran a PreShip scan on ${url}. Here are the violations I need to fix:\n\n`
        : `Fix these issues found by PreShip on ${url}:\n\n`;

  const body = violations
    .map((v, i) => {
      const t = translateViolation(v);
      return `${i + 1}. [${v.category.toUpperCase()}] ${t.title}\n   ${t.description}${v.selector ? `\n   Element: ${v.selector}` : ""}`;
    })
    .join("\n\n");

  const footer =
    tool === "cursor"
      ? "\n\nPlease fix each issue and explain the changes."
      : tool === "claude"
        ? "\n\nFor each violation, provide the fix with code changes."
        : "\n\nGenerate updated components that fix these issues.";

  return header + body + footer;
}

/* ------------------------------------------------------------------ */
/* Score Circle component                                              */
/* ------------------------------------------------------------------ */
function ScoreCircle({
  score,
  size = 180,
  strokeWidth = 7,
  animated = true,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2A2A2A" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : circumference}
          style={{
            filter: `drop-shadow(0 0 8px ${color}40)`,
            transition: animated ? "stroke-dashoffset 1.2s ease-out" : "none",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold tabular-nums text-5xl" style={{ color }}>
          {score}
        </span>
        <span className="text-2xl font-bold text-neutral-300 mt-1">{getLetterGrade(score)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small Score Circle for categories                                   */
/* ------------------------------------------------------------------ */
function SmallScoreCircle({ score, size = 72, strokeWidth = 3.5 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2A2A2A" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold tabular-nums text-lg" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast component                                                     */
/* ------------------------------------------------------------------ */
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-sm font-medium shadow-xl transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confetti (CSS only)                                                 */
/* ------------------------------------------------------------------ */
function Confetti() {
  const colors = ["#F97316", "#22C55E", "#EAB308", "#3B82F6", "#A855F7", "#EC4899"];
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 50 }).map((_, i) => {
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 2;
        const size = 6 + Math.random() * 6;
        const rotation = Math.random() * 360;
        return (
          <div
            key={i}
            className="absolute top-0 animate-confetti-fall"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size * 0.6}px`,
              backgroundColor: color,
              borderRadius: "2px",
              transform: `rotate(${rotation}deg)`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading / scanning state                                            */
/* ------------------------------------------------------------------ */
const SCAN_STEPS = [
  "Checking accessibility...",
  "Checking security...",
  "Checking performance...",
  "Checking SEO...",
  "Checking privacy...",
  "Checking mobile...",
  "Analyzing results...",
];

function ScanningState({ url }: { url?: string }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SCAN_STEPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const progress = ((stepIndex + 1) / SCAN_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          {/* Pulsing scanner icon */}
          <div className="w-20 h-20 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
            <svg className="w-10 h-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Scanning {url ? new URL(url).hostname : "your site"}...
          </h1>
          <p className="text-neutral-400 mb-10">This usually takes 15-30 seconds.</p>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-neutral-800 mb-6 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Current step */}
          <p className="text-sm text-neutral-300 h-5 transition-all duration-300">{SCAN_STEPS[stepIndex]}</p>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error state                                                         */
/* ------------------------------------------------------------------ */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Scan Failed</h1>
          <p className="text-neutral-400 mb-8">{message}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
          >
            Try another URL
          </a>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category icons                                                      */
/* ------------------------------------------------------------------ */
function getCategoryIcon(category: string) {
  const icons: Record<string, React.ReactNode> = {
    accessibility: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    security: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    performance: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    seo: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    privacy: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    mobile: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  };
  return icons[category] || (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    accessibility: "Accessibility",
    security: "Security",
    performance: "Performance",
    seo: "SEO",
    privacy: "Privacy",
    mobile: "Mobile",
  };
  return labels[category] || category;
}

/* ------------------------------------------------------------------ */
/* Impact summary cards                                                */
/* ------------------------------------------------------------------ */
function ImpactCards({ categories, violations }: { categories: CategoryScore[]; violations: Violation[] }) {
  const a11y = categories.find((c) => c.category === "accessibility");
  const security = categories.find((c) => c.category === "security");
  const perf = categories.find((c) => c.category === "performance");

  const a11yViolations = violations.filter((v) => v.category === "accessibility").length;
  const securityViolations = violations.filter((v) => v.category === "security").length;

  const cards: { emoji: string; text: string; color: string; show: boolean }[] = [
    {
      emoji: "\uD83D\uDD34",
      text:
        a11y && a11y.score < 70
          ? `${a11yViolations} accessibility issue${a11yViolations !== 1 ? "s" : ""} may prevent people with disabilities from using your site`
          : `Your site has good accessibility (${a11y?.score ?? 0}/100)`,
      color: a11y && a11y.score < 70 ? "border-red-500/30 bg-red-500/5" : "border-green-500/30 bg-green-500/5",
      show: true,
    },
    {
      emoji: "\uD83D\uDFE1",
      text:
        security && security.score < 70
          ? `Your site has ${securityViolations} security vulnerabilit${securityViolations !== 1 ? "ies" : "y"}`
          : `Your site has solid security (${security?.score ?? 0}/100)`,
      color: security && security.score < 70 ? "border-yellow-500/30 bg-yellow-500/5" : "border-green-500/30 bg-green-500/5",
      show: true,
    },
    {
      emoji: "\uD83D\uDFE2",
      text:
        perf && perf.score > 70
          ? `Your site loads fast (${perf.score}/100)`
          : `Your site has performance issues (${perf?.score ?? 0}/100)`,
      color: perf && perf.score > 70 ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5",
      show: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
      {cards
        .filter((c) => c.show)
        .map((card, i) => (
          <div key={i} className={`rounded-xl border ${card.color} p-5 flex items-start gap-3`}>
            <span className="text-2xl flex-shrink-0">{card.emoji}</span>
            <p className="text-sm text-neutral-300 leading-relaxed">{card.text}</p>
          </div>
        ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Results Page                                                   */
/* ------------------------------------------------------------------ */
export default function ResultsPage() {
  const params = useParams();
  const id = params.id as string;

  const [scan, setScan] = useState<ScanData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loggedIn = typeof window !== "undefined" ? isLoggedIn() : false;

  /* ---- fetch & poll ---- */
  const fetchScan = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/scan/public/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Scan not found. It may have expired or the URL is incorrect.");
        } else {
          setError("Failed to load scan results. Please try again.");
        }
        setLoading(false);
        return;
      }
      const json = await res.json();
      const data: ScanData = json.data ?? json;
      setScan(data);
      setLoading(false);

      // Stop polling when done
      if (data.status === "completed" || data.status === "failed") {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        // Trigger confetti for 80+
        if (data.status === "completed" && data.overallScore >= 80) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
        }
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchScan();

    // Start polling
    pollingRef.current = setInterval(fetchScan, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchScan]);

  /* ---- toast helper ---- */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- copy helper ---- */
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Prompt copied! Paste it in ${label} to fix.`);
    } catch {
      showToast("Failed to copy. Please try again.");
    }
  };

  /* ---- render states ---- */
  if (loading && !scan) {
    return <ScanningState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!scan) {
    return <ErrorState message="Scan not found." />;
  }

  // Show scanning animation while in progress
  if (scan.status !== "completed" && scan.status !== "failed") {
    return <ScanningState url={scan.url} />;
  }

  if (scan.status === "failed") {
    return <ErrorState message="The scan failed. The site may be unreachable or blocking our scanner." />;
  }

  /* ---- completed scan data ---- */
  const domain = (() => {
    try {
      return new URL(scan.url).hostname;
    } catch {
      return scan.url;
    }
  })();
  const violations = scan.violations ?? [];
  const categories = scan.categories ?? [];
  const percentile = getPercentile(scan.overallScore);
  const scanDate = new Date(scan.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Group violations by category
  const groupedViolations: Record<string, TranslatedViolation[]> = {};
  violations.forEach((v) => {
    const translated = translateViolation(v);
    if (!groupedViolations[v.category]) {
      groupedViolations[v.category] = [];
    }
    groupedViolations[v.category].push(translated);
  });

  // Violations for prompts (limited for non-logged-in)
  const promptViolations = loggedIn ? violations : violations.slice(0, 3);

  // Share URLs
  const twitterText = `Just scanned ${domain} with @preshipdev \u2014 scored ${scan.overallScore}/100. ${violations.length} violation${violations.length !== 1 ? "s" : ""} found. Check your app free at preship.dev`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://preship.dev/results/${id}`)}`;

  // Badge markdown
  const badgeMarkdown = `[![PreShip Score](https://preship.dev/api/og/scan/${id})](https://preship.dev/results/${id})`;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      {showConfetti && <Confetti />}
      <Toast message={toast || ""} visible={!!toast} />

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* ============================================================ */}
          {/* Header                                                       */}
          {/* ============================================================ */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900 text-xs text-neutral-400 mb-6">
              <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Scanned {scanDate}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{domain}</h1>
            <p className="text-neutral-400 text-sm">{scan.url}</p>
          </div>

          {/* ============================================================ */}
          {/* Score + Grade                                                 */}
          {/* ============================================================ */}
          <div className="flex justify-center mb-6">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 md:p-12 text-center">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-4">Overall Score</p>
              <ScoreCircle score={scan.overallScore} size={200} strokeWidth={8} />
              <p className="mt-5 text-sm text-neutral-400">
                Your app scores{" "}
                <span className="text-white font-medium">
                  {scan.overallScore >= 50 ? "better" : "worse"} than {percentile}%
                </span>{" "}
                of apps we&apos;ve scanned
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                {violations.length} violation{violations.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* Celebration for 80+                                           */}
          {/* ============================================================ */}
          {scan.overallScore >= 80 && (
            <div className="text-center mb-8 rounded-xl border border-green-500/20 bg-green-500/5 p-6">
              <p className="text-xl font-bold text-green-400 mb-1">
                Your app is in the top 20%! {"\uD83C\uDF89"}
              </p>
              <p className="text-sm text-neutral-400">Great job keeping your app accessible, secure, and fast.</p>
            </div>
          )}

          {/* Improvement banner */}
          {scan.previousScore !== undefined && scan.previousScore !== null && scan.overallScore > scan.previousScore && (
            <div className="text-center mb-8 rounded-xl border border-orange-500/20 bg-orange-500/5 p-6">
              <p className="text-xl font-bold text-orange-400 mb-1">
                You improved from {scan.previousScore} {"\u2192"} {scan.overallScore}! {"\uD83D\uDE80"}
              </p>
              <p className="text-sm text-neutral-400">Keep going! Share your progress with your team.</p>
            </div>
          )}

          {/* ============================================================ */}
          {/* Impact Summary Cards                                          */}
          {/* ============================================================ */}
          <ImpactCards categories={categories} violations={violations} />

          {/* ============================================================ */}
          {/* Category Scores                                               */}
          {/* ============================================================ */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            {categories.map((cat) => (
              <div key={cat.category} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 flex flex-col items-center text-center">
                <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                  {getCategoryIcon(cat.category)}
                </div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">{getCategoryLabel(cat.category)}</p>
                <SmallScoreCircle score={cat.score} />
                <p className="text-xs text-neutral-500 mt-2">
                  {cat.violations} issue{cat.violations !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>

          {/* ============================================================ */}
          {/* Violations in Human Language                                   */}
          {/* ============================================================ */}
          {violations.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Issues Found
              </h2>

              {Object.entries(groupedViolations).map(([category, items]) => (
                <div key={category} className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400">
                      {getCategoryIcon(category)}
                    </div>
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                      {getCategoryLabel(category)}
                    </h3>
                    <span className="text-xs text-neutral-500 ml-auto">{items.length} issues</span>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, idx) => {
                      // Count visible items across all categories to find global index
                      const globalIdx = violations.findIndex(
                        (v) =>
                          translateViolation(v).title === item.title &&
                          translateViolation(v).description === item.description
                      );
                      const isBlurred = !loggedIn && globalIdx >= 3;

                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 ${isBlurred ? "relative overflow-hidden" : ""}`}
                        >
                          {isBlurred && (
                            <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm z-10 flex items-center justify-center">
                              {/* Only show overlay on the first blurred item */}
                              {globalIdx === 3 && (
                                <div className="text-center px-4">
                                  <p className="text-sm font-medium text-white mb-2">
                                    Create free account to see all {violations.length} violations
                                  </p>
                                  <a
                                    href="/signup"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors"
                                  >
                                    Sign up free
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex items-start gap-3">
                            <span className="text-lg flex-shrink-0">{item.emoji}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">{item.title}</p>
                              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ============================================================ */}
          {/* Fix Prompts                                                    */}
          {/* ============================================================ */}
          {violations.length > 0 && (
            <div className="mb-12 rounded-xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Fix these issues
              </h2>
              <p className="text-sm text-neutral-400 mb-6">
                Copy a prompt for your AI coding tool and paste it to fix {loggedIn ? "all" : "the top 3"} violations.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { tool: "cursor" as const, label: "Cursor", icon: "\u2728" },
                  { tool: "claude" as const, label: "Claude", icon: "\uD83E\uDDE0" },
                  { tool: "v0" as const, label: "v0", icon: "\u25B2" },
                ].map(({ tool, label, icon }) => (
                  <button
                    key={tool}
                    onClick={() => copyToClipboard(generateFixPrompt(promptViolations, tool, scan.url), label)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors border border-neutral-700 hover:border-neutral-600"
                  >
                    <span>{icon}</span>
                    Copy prompt for {label}
                  </button>
                ))}
              </div>

              {!loggedIn && violations.length > 3 && (
                <div className="mt-4 rounded-lg border border-neutral-700 bg-neutral-800/50 p-4 text-center">
                  <p className="text-xs text-neutral-400">
                    Prompt includes top 3 violations.{" "}
                    <a href="/signup" className="text-orange-400 hover:text-orange-300 font-medium">
                      Sign up free
                    </a>{" "}
                    to get prompts for all {violations.length} violations.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* Share Section                                                  */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Share buttons */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share your score
              </h2>
              <div className="flex gap-3">
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors border border-neutral-700"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Post on X
                </a>
                <a
                  href={linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors border border-neutral-700"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  Share on LinkedIn
                </a>
              </div>
            </div>

            {/* Embed badge */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Embed Badge
              </h2>
              <p className="text-xs text-neutral-400 mb-3">Add this badge to your README to show your score.</p>
              <div className="relative">
                <pre className="text-xs text-neutral-300 bg-neutral-800 rounded-lg p-3 overflow-x-auto border border-neutral-700">
                  <code>{badgeMarkdown}</code>
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(badgeMarkdown);
                    showToast("Badge markdown copied!");
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white transition-colors"
                  title="Copy badge markdown"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CTA                                                           */}
          {/* ============================================================ */}
          <div className="text-center rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-900/50 p-10 md:p-14">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mx-auto mb-6">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            {loggedIn ? (
              <>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Run another scan</h2>
                <p className="text-neutral-400 mb-8 max-w-md mx-auto">
                  Keep scanning to track improvements and catch new issues.
                </p>
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
                >
                  Go to Dashboard
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Want the full picture?</h2>
                <p className="text-neutral-400 mb-8 max-w-md mx-auto">
                  Create a free account to save scan history, get unlimited scans, and track improvements over time.
                </p>
                <a
                  href="/signup"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
                >
                  Start scanning free
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-500">&copy; {new Date().getFullYear()} PreShip. All rights reserved.</p>
          <a href="https://preship.dev" className="text-xs text-orange-500 hover:text-orange-400 font-medium">
            preship.dev
          </a>
        </div>
      </footer>
    </div>
  );
}
