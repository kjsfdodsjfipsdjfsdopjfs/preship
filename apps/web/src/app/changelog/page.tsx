import Navbar from "@/components/Navbar";

const releases = [
  {
    version: "0.3.0",
    date: "March 15, 2026",
    tag: "Latest",
    changes: [
      "SSRF protection for scan engine — internal network requests are now blocked by default",
      "Database migration system with versioned schema management",
      "Auth improvements: session refresh, password reset flow, and rate limiting on login",
      "New security scanner rule: detects exposed .env files and source maps in production",
      "Dashboard performance improvements — 40% faster initial load",
      "API rate limit headers now included in all responses",
    ],
  },
  {
    version: "0.2.0",
    date: "March 5, 2026",
    tag: null,
    changes: [
      "Dashboard with project overview, scan history, and trend charts",
      "Detailed scan results page with violation-level drill-down",
      "API documentation with interactive examples at /docs",
      "PDF export for compliance reports (VPAT format)",
      "GitHub OAuth sign-in support",
      "Webhook notifications for completed scans",
    ],
  },
  {
    version: "0.1.0",
    date: "February 20, 2026",
    tag: null,
    changes: [
      "Initial public beta release",
      "Scanner engine with 200+ checks across accessibility, security, and performance",
      "WCAG 2.2 AA compliance checking with element-level detail",
      "OWASP Top 10 security scanning including XSS, CSP, and header analysis",
      "Core Web Vitals performance metrics (LCP, FID, CLS, TTFB)",
      "Landing page with instant URL scanning",
      "REST API with API key authentication",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
        <h1 className="text-4xl font-bold text-white mb-4">Changelog</h1>
        <p className="text-lg text-neutral-300 mb-12">
          New updates and improvements to PreShip.
        </p>

        <div className="space-y-12">
          {releases.map((release) => (
            <section key={release.version} className="relative">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  v{release.version}
                </span>
                {release.tag && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                    {release.tag}
                  </span>
                )}
                <span className="text-sm text-neutral-500">{release.date}</span>
              </div>

              <ul className="space-y-3 ml-1">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-300">
                    <svg className="w-4 h-4 text-orange-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm leading-relaxed">{change}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 border-b border-neutral-800" />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
