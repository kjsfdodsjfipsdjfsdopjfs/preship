import { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface CategoryScore {
  category: string;
  score: number;
  violationCount?: number;
}

interface ScanData {
  scanId: string;
  url: string;
  status: string;
  overallScore: number;
  categories: CategoryScore[];
  violations: unknown[];
  createdAt: string;
  completedAt?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.preship.dev";

/* ------------------------------------------------------------------ */
/* Data fetching                                                       */
/* ------------------------------------------------------------------ */
async function getScanData(token: string): Promise<ScanData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/scans/${token}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Metadata                                                            */
/* ------------------------------------------------------------------ */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const scan = await getScanData(token);
  if (!scan) {
    return { title: "Scan Not Found" };
  }

  const domain = new URL(scan.url).hostname;
  const title = `${domain} scored ${scan.overallScore}/100 | PreShip`;
  const description = `Accessibility, security & performance scan results for ${domain}. Overall score: ${scan.overallScore}/100.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://preship.dev/scan/${token}`,
      images: [
        {
          url: `/api/og/scan/${token}`,
          width: 1200,
          height: 630,
          alt: `PreShip scan results for ${domain}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/scan/${token}`],
    },
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function getScoreColor(score: number): string {
  if (score >= 90) return "#16A34A";
  if (score >= 70) return "#22C55E";
  if (score >= 50) return "#EAB308";
  return "#EF4444";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "accessibility":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    case "security":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case "performance":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "seo":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case "privacy":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    case "mobile":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
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
/* Share URL builders                                                   */
/* ------------------------------------------------------------------ */
function getTwitterShareUrl(domain: string, score: number, token: string): string {
  const text = `${domain} scored ${score}/100 on PreShip - accessibility, security & performance scan.\n\nScan your app:`;
  const url = `https://preship.dev/scan/${token}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

function getLinkedInShareUrl(token: string): string {
  const url = `https://preship.dev/scan/${token}`;
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

/* ------------------------------------------------------------------ */
/* Score Circle (static SVG, no client JS)                             */
/* ------------------------------------------------------------------ */
function StaticScoreCircle({
  score,
  size = 160,
  strokeWidth = 6,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2A2A2A"
          strokeWidth={strokeWidth}
        />
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
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tabular-nums text-4xl"
          style={{ color }}
        >
          {score}
        </span>
        <span className="text-neutral-400 text-sm mt-0.5">
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

function SmallScoreCircle({
  score,
  size = 80,
  strokeWidth = 4,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2A2A2A"
          strokeWidth={strokeWidth}
        />
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
/* Copy button (client island)                                         */
/* ------------------------------------------------------------------ */
function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors border border-neutral-700"
      onClick={undefined}
      data-copy={text}
      title={`Copy ${label}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      Copy
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */
export default async function PublicScanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const scan = await getScanData(token);

  if (!scan || scan.status === "failed") {
    notFound();
  }

  const domain = new URL(scan.url).hostname;
  const categories = scan.categories ?? [];
  const violationCount = scan.violations?.length ?? 0;
  const scanDate = new Date(scan.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const badgeMarkdown = `[![PreShip Score](https://preship.dev/api/og/scan/${token})](https://preship.dev/scan/${token})`;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900 text-xs text-neutral-400 mb-6">
              <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Scanned {scanDate}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {domain}
            </h1>
            <p className="text-neutral-400 text-sm">
              {scan.url}
            </p>
          </div>

          {/* Overall Score */}
          <div className="flex justify-center mb-12">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 md:p-12 text-center">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-4">
                Overall Score
              </p>
              <StaticScoreCircle score={scan.overallScore} size={180} strokeWidth={7} />
              <p className="mt-4 text-sm text-neutral-400">
                {violationCount} violation{violationCount !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>

          {/* Category Scores Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            {categories.map((cat) => (
              <div
                key={cat.category}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 flex flex-col items-center text-center"
              >
                <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                  {getCategoryIcon(cat.category)}
                </div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                  {getCategoryLabel(cat.category)}
                </p>
                <SmallScoreCircle score={cat.score} size={72} strokeWidth={3.5} />
                {cat.violationCount !== undefined && (
                  <p className="text-xs text-neutral-500 mt-2">
                    {cat.violationCount} issue{cat.violationCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Share + Embed Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Share buttons */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Results
              </h2>
              <div className="flex gap-3">
                <a
                  href={getTwitterShareUrl(domain, scan.overallScore, token)}
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
                  href={getLinkedInShareUrl(token)}
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
              <p className="text-xs text-neutral-400 mb-3">
                Add this badge to your README to show your score.
              </p>
              <div className="relative">
                <pre className="text-xs text-neutral-300 bg-neutral-800 rounded-lg p-3 overflow-x-auto border border-neutral-700">
                  <code>{badgeMarkdown}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-900/50 p-10 md:p-14">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mx-auto mb-6">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Scan your own app
            </h2>
            <p className="text-neutral-400 mb-8 max-w-md mx-auto">
              Get instant accessibility, security & performance insights. Free tier available.
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
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-500">
            &copy; {new Date().getFullYear()} PreShip. All rights reserved.
          </p>
          <a href="https://preship.dev" className="text-xs text-orange-500 hover:text-orange-400 font-medium">
            preship.dev
          </a>
        </div>
      </footer>

      {/* Inline script for copy buttons */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('click', function(e) {
              var btn = e.target.closest('[data-copy]');
              if (!btn) return;
              var text = btn.getAttribute('data-copy');
              navigator.clipboard.writeText(text).then(function() {
                var orig = btn.innerHTML;
                btn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Copied!';
                setTimeout(function() { btn.innerHTML = orig; }, 2000);
              });
            });
          `,
        }}
      />
    </div>
  );
}
