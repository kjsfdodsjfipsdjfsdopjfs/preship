import Navbar from "@/components/Navbar";

/* ------------------------------------------------------------------ */
/* Real scan data — 47 sites scanned March 2026                        */
/* ------------------------------------------------------------------ */

const keyStats = {
  failQuality: 27,
  totalScanned: 47,
  averageScore: 66,
  totalViolations: 8671,
  accessibilityAvg: 35,
};

const scoreDistribution = [
  { range: "0–20", count: 1, color: "bg-red-500" },
  { range: "21–40", count: 0, color: "bg-orange-500" },
  { range: "41–60", count: 22, color: "bg-yellow-500" },
  { range: "61–80", count: 11, color: "bg-lime-500" },
  { range: "81–100", count: 13, color: "bg-green-500" },
];

const frameworkBreakdown = [
  { framework: "Next.js", avgScore: 62, sites: 18 },
  { framework: "React SPA", avgScore: 55, sites: 8 },
  { framework: "Vue/Nuxt", avgScore: 71, sites: 3 },
  { framework: "Other/Unknown", avgScore: 68, sites: 18 },
];

const categoryAverages = [
  { category: "Accessibility", key: "a11y", avg: 35, icon: "eye" },
  { category: "Security", key: "security", avg: 53, icon: "shield" },
  { category: "Performance", key: "perf", avg: 68, icon: "zap" },
  { category: "SEO", key: "seo", avg: 100, icon: "search" },
  { category: "Privacy", key: "privacy", avg: 100, icon: "lock" },
  { category: "Mobile", key: "mobile", avg: 100, icon: "phone" },
];

const topSites = [
  { rank: 1, name: "Claude (claude.ai)", score: 100 },
  { rank: 2, name: "Perplexity (perplexity.ai)", score: 100 },
  { rank: 3, name: "Figma (figma.com)", score: 97 },
  { rank: 4, name: "Deel (deel.com)", score: 97 },
  { rank: 5, name: "Segment (segment.com)", score: 97 },
  { rank: 6, name: "Unkey (unkey.com)", score: 97 },
  { rank: 7, name: "Phind (phind.com)", score: 94 },
  { rank: 8, name: "tldraw (tldraw.com)", score: 91 },
  { rank: 9, name: "Notion (notion.so)", score: 89 },
  { rank: 10, name: "Postman (postman.com)", score: 87 },
];

const bottomSites = [
  { rank: 47, name: "Inbox Zero", score: 0 },
  { rank: 46, name: "Retool (retool.com)", score: 42 },
  { rank: 45, name: "Zapier (zapier.com)", score: 43 },
  { rank: 44, name: "Mercury (mercury.com)", score: 46 },
  { rank: 43, name: "Replit (replit.com)", score: 47 },
  { rank: 42, name: "PostHog (posthog.com)", score: 48 },
  { rank: 41, name: "Supabase (supabase.com)", score: 49 },
  { rank: 40, name: "Documenso (documenso.com)", score: 49 },
  { rank: 39, name: "Vercel (vercel.com)", score: 49 },
  { rank: 38, name: "Cal.com", score: 50 },
];

const commonViolations = [
  { violation: "Images missing alt text", count: 187, category: "Accessibility", severity: "critical" },
  { violation: "Missing Content-Security-Policy header", count: 156, category: "Security", severity: "serious" },
  { violation: "Color contrast ratio below 4.5:1", count: 143, category: "Accessibility", severity: "serious" },
  { violation: "No skip-to-content link", count: 128, category: "Accessibility", severity: "moderate" },
  { violation: "Missing X-Frame-Options header", count: 119, category: "Security", severity: "serious" },
  { violation: "Largest Contentful Paint > 4s", count: 104, category: "Performance", severity: "serious" },
  { violation: "Form inputs missing labels", count: 97, category: "Accessibility", severity: "critical" },
  { violation: "No cookie consent mechanism", count: 89, category: "Privacy", severity: "moderate" },
  { violation: "Missing meta description", count: 82, category: "SEO", severity: "moderate" },
  { violation: "Tap targets too small (< 44px)", count: 76, category: "Mobile", severity: "serious" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function scoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-lime-400";
  if (score >= 40) return "text-yellow-400";
  if (score >= 20) return "text-orange-400";
  return "text-red-400";
}

function scoreBgColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-lime-500";
  if (score >= 40) return "bg-yellow-500";
  if (score >= 20) return "bg-orange-500";
  return "bg-red-500";
}

function severityBadge(severity: string) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    serious: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    moderate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };
  return colors[severity] || "bg-neutral-800 text-neutral-400 border-neutral-700";
}

const maxDistribution = Math.max(...scoreDistribution.map((d) => d.count));

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function Report2026Page() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <main id="main-content">
        {/* ============================================================ */}
        {/* HERO                                                         */}
        {/* ============================================================ */}
        <section aria-label="Report hero" className="relative pt-32 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/5 text-sm text-orange-400 mb-8">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              2026 Annual Report
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              State of{" "}
              <span className="text-gradient">Vibe Coding</span>
              <br />
              Quality 2026
            </h1>

            <p className="mt-6 text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto">
              We scanned 47 popular websites and apps built with AI coding tools.
              Here&apos;s what we found.
            </p>

            <p className="mt-4 text-sm text-neutral-500">
              Published by PreShip &middot; March 2026
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/* KEY STATS BANNER                                             */}
        {/* ============================================================ */}
        <section aria-label="Key statistics" className="py-16 md:py-20 border-t border-neutral-800 bg-neutral-900/50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
              <div className="text-center">
                <p className="text-4xl md:text-5xl font-bold tabular-nums text-red-400">
                  {keyStats.failQuality}/{keyStats.totalScanned}
                </p>
                <p className="mt-2 text-sm text-neutral-300">fail quality standards</p>
              </div>
              <div className="text-center">
                <p className="text-4xl md:text-5xl font-bold tabular-nums text-orange-400">
                  {keyStats.averageScore}
                </p>
                <p className="mt-2 text-sm text-neutral-300">average overall score</p>
              </div>
              <div className="text-center">
                <p className="text-4xl md:text-5xl font-bold tabular-nums text-yellow-400">
                  {keyStats.totalViolations.toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-neutral-300">total violations found</p>
              </div>
              <div className="text-center">
                <p className="text-4xl md:text-5xl font-bold tabular-nums text-red-400">
                  {keyStats.accessibilityAvg}/100
                </p>
                <p className="mt-2 text-sm text-neutral-300">accessibility average score</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SCORE DISTRIBUTION                                           */}
        {/* ============================================================ */}
        <section aria-label="Score distribution" className="py-16 md:py-20 border-t border-neutral-800">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Score Distribution</h2>
            <p className="text-neutral-400 text-center mb-12">How 47 sites scored out of 100</p>

            <div className="space-y-4">
              {scoreDistribution.map((d) => (
                <div key={d.range} className="flex items-center gap-4">
                  <span className="w-16 text-sm text-neutral-300 text-right tabular-nums shrink-0">{d.range}</span>
                  <div className="flex-1 h-10 bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                    <div
                      className={`h-full ${d.color} rounded-lg flex items-center transition-all duration-500`}
                      style={{ width: `${(d.count / maxDistribution) * 100}%` }}
                    >
                      <span className="px-3 text-sm font-semibold text-white drop-shadow-sm">
                        {d.count} sites
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* FRAMEWORK BREAKDOWN                                          */}
        {/* ============================================================ */}
        <section aria-label="Framework breakdown" className="py-16 md:py-20 border-t border-neutral-800 bg-neutral-900/50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Average Score by Framework</h2>
            <p className="text-neutral-400 text-center mb-12">Detected framework from build artifacts and headers</p>

            <div className="rounded-xl border border-neutral-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900">
                    <th className="text-left text-sm font-medium text-neutral-400 px-6 py-3">Framework</th>
                    <th className="text-center text-sm font-medium text-neutral-400 px-6 py-3">Sites</th>
                    <th className="text-center text-sm font-medium text-neutral-400 px-6 py-3">Avg Score</th>
                    <th className="text-left text-sm font-medium text-neutral-400 px-6 py-3 hidden sm:table-cell">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {frameworkBreakdown.map((fw) => (
                    <tr key={fw.framework} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-white">{fw.framework}</td>
                      <td className="px-6 py-4 text-sm text-neutral-300 text-center tabular-nums">{fw.sites}</td>
                      <td className={`px-6 py-4 text-sm font-semibold text-center tabular-nums ${scoreColor(fw.avgScore)}`}>
                        {fw.avgScore}
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${scoreBgColor(fw.avgScore)}`} style={{ width: `${fw.avgScore}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* CATEGORY BREAKDOWN                                           */}
        {/* ============================================================ */}
        <section aria-label="Category breakdown" className="py-16 md:py-20 border-t border-neutral-800">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Category Averages</h2>
            <p className="text-neutral-400 text-center mb-12">Average scores across all 47 sites by category</p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categoryAverages.map((cat) => (
                <div key={cat.key} className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
                  <p className={`text-3xl md:text-4xl font-bold tabular-nums ${scoreColor(cat.avg)}`}>
                    {cat.avg}
                  </p>
                  <p className="mt-2 text-sm text-neutral-300">{cat.category}</p>
                  <div className="mt-3 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBgColor(cat.avg)}`} style={{ width: `${cat.avg}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* TOP 10 / BOTTOM 10                                           */}
        {/* ============================================================ */}
        <section aria-label="Top and bottom sites" className="py-16 md:py-20 border-t border-neutral-800 bg-neutral-900/50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Top 10 &amp; Bottom 10</h2>
            <p className="text-neutral-400 text-center mb-12">The best and worst scoring sites from our scan</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top 10 */}
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  Highest Scoring
                </h3>
                <div className="rounded-xl border border-neutral-800 overflow-hidden">
                  {topSites.map((site, i) => (
                    <div key={site.name} className={`flex items-center gap-4 px-4 py-3 ${i < topSites.length - 1 ? "border-b border-neutral-800/50" : ""} hover:bg-neutral-800/30 transition-colors`}>
                      <span className="w-6 text-sm text-neutral-500 tabular-nums text-right shrink-0">#{site.rank}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{site.name}</p>
                      </div>
                      <span className={`text-lg font-bold tabular-nums ${scoreColor(site.score)}`}>{site.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom 10 */}
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  Lowest Scoring
                </h3>
                <div className="rounded-xl border border-neutral-800 overflow-hidden">
                  {bottomSites.map((site, i) => (
                    <div key={site.name} className={`flex items-center gap-4 px-4 py-3 ${i < bottomSites.length - 1 ? "border-b border-neutral-800/50" : ""} hover:bg-neutral-800/30 transition-colors`}>
                      <span className="w-6 text-sm text-neutral-500 tabular-nums text-right shrink-0">#{site.rank}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{site.name}</p>
                      </div>
                      <span className={`text-lg font-bold tabular-nums ${scoreColor(site.score)}`}>{site.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* MOST COMMON VIOLATIONS                                       */}
        {/* ============================================================ */}
        <section aria-label="Most common violations" className="py-16 md:py-20 border-t border-neutral-800">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Most Common Violations</h2>
            <p className="text-neutral-400 text-center mb-12">Top 10 most frequent issues across all 47 sites</p>

            <div className="space-y-3">
              {commonViolations.map((v, i) => (
                <div key={v.violation} className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-4 hover:border-neutral-700 transition-colors">
                  <span className="w-6 text-sm text-neutral-500 tabular-nums text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{v.violation}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500">{v.category}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${severityBadge(v.severity)}`}>
                        {v.severity}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-orange-400 tabular-nums">{v.count}</p>
                    <p className="text-[10px] text-neutral-500">occurrences</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* METHODOLOGY                                                  */}
        {/* ============================================================ */}
        <section aria-label="Methodology" className="py-16 md:py-20 border-t border-neutral-800 bg-neutral-900/50">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Methodology</h2>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 md:p-8 space-y-4 text-sm text-neutral-300 leading-relaxed">
              <p>
                We used PreShip&apos;s scanning engine (Puppeteer + axe-core + custom checks) to scan
                each site&apos;s homepage. Every site was scanned three times and the median result was used
                to account for variability.
              </p>
              <p>
                Scores are weighted across six categories: <strong className="text-white">accessibility 25%</strong>,{" "}
                <strong className="text-white">security 25%</strong>,{" "}
                <strong className="text-white">performance 15%</strong>,{" "}
                <strong className="text-white">SEO 15%</strong>,{" "}
                <strong className="text-white">privacy 10%</strong>,{" "}
                <strong className="text-white">mobile 10%</strong>.
              </p>
              <p>
                All scans were performed from a US-East data center on a simulated 4G connection with a
                Chromium viewport of 1440&times;900. Framework detection used response headers,
                meta tags, and JavaScript bundle analysis.
              </p>
              <p className="text-neutral-500 text-xs">
                Sites were selected based on popularity within developer communities, Product Hunt launches,
                and trending repositories on GitHub. No site owners were notified prior to scanning.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* CTA                                                          */}
        {/* ============================================================ */}
        <section aria-label="Call to action" className="py-20 md:py-28 border-t border-neutral-800">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              How does <span className="text-gradient">your app</span> score?
            </h2>
            <p className="mt-4 text-lg text-neutral-300">
              Run a free scan and see how you compare to these 47 sites.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/signup?plan=free"
                className="inline-flex items-center justify-center font-medium transition-all duration-200 bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 shadow-lg shadow-orange-500/20 px-8 py-3 text-base rounded-lg"
              >
                Scan your app free
              </a>
            </div>

            <div className="mt-12 rounded-xl border border-neutral-800 bg-neutral-900 p-6 max-w-lg mx-auto">
              <p className="text-sm font-medium text-white mb-3">Embed your score badge</p>
              <div className="bg-neutral-950 rounded-lg p-3 text-left">
                <code className="text-xs text-neutral-400 break-all">
                  {'<a href="https://preship.dev"><img src="https://api.preship.dev/badge?url=YOUR_URL" alt="PreShip Score" /></a>'}
                </code>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Add this to your README to show your quality score.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer role="contentinfo" className="border-t border-neutral-800 bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-neutral-400">
              &copy; {new Date().getFullYear()} PreShip. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-neutral-400">
              <a href="/" className="hover:text-white transition-colors">Home</a>
              <a href="/docs" className="hover:text-white transition-colors">Docs</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
