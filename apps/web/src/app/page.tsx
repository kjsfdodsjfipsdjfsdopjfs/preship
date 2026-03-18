import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import CodeBlock from "@/components/CodeBlock";
import PricingTable from "@/components/PricingTable";
import HeroScanInput from "@/components/HeroScanInput";

/* ------------------------------------------------------------------ */
/* Feature data                                                        */
/* ------------------------------------------------------------------ */
const features = [
  {
    title: "Accessibility",
    description: "WCAG 2.2 AA/AAA audit with element-level detail. Catch missing alt text, color contrast failures, keyboard traps, and ARIA issues.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    title: "Security",
    description: "Detect exposed API keys, missing CSP headers, XSS vectors, insecure dependencies, and open redirects before attackers do.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Performance",
    description: "Lighthouse-based metrics including LCP, FID, CLS, and TTFB. Get actionable recommendations to hit Core Web Vitals thresholds.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Fix Suggestions",
    description: "Every violation comes with a concrete code fix you can copy-paste. AI-generated patches tailored to your framework.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    title: "CI/CD Integration",
    description: "Add a quality gate to your pipeline. Fail builds that drop below your score threshold. GitHub Actions, GitLab CI, and more.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    title: "Compliance Reports",
    description: "Generate VPAT and ADA compliance documentation. Export PDF reports for legal review, client deliverables, or audits.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const steps = [
  { step: "1", title: "Paste your URL", description: "Enter any public URL or connect your staging environment. We support SPAs, SSR, and static sites." },
  { step: "2", title: "We scan everything", description: "Our engine runs 200+ checks for accessibility, security, and performance in parallel. Results in under 30 seconds." },
  { step: "3", title: "Get results + fixes", description: "View detailed violation reports with severity ratings and copy-paste code fixes. Export PDF for your team." },
];

const apiExample = `curl -X POST https://api.preship.dev/api/scans \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.vercel.app",
    "checks": ["accessibility", "security", "performance"]
  }'

# Response (webhook or poll):
{
  "id": "scan_abc123",
  "score": 72,
  "accessibility": 58,
  "security": 89,
  "performance": 71,
  "violations": 23,
  "fixable": 18
}`;

/* ------------------------------------------------------------------ */
/* Page Component (Server Component)                                   */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium">
        Skip to main content
      </a>
      <Navbar />

      <main id="main-content" role="main">
      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}
      <section aria-label="Hero" className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-800 bg-neutral-900 text-sm text-neutral-300 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" aria-hidden="true" />
            Now in public beta
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight animate-slide-up">
            Your AI wrote the code.
            <br />
            <span className="text-gradient">We check if humans can use it.</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto animate-slide-up animate-delay-100">
            Accessibility, security, and performance scanning for vibe-coded apps.
            API-first. Results in seconds.
          </p>

          <HeroScanInput />

          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-neutral-300 text-sm animate-fade-in animate-delay-300">
            {["WCAG 2.2 AA", "OWASP Top 10", "Core Web Vitals", "ADA Section 508"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PROBLEM                                                      */}
      {/* ============================================================ */}
      <section aria-label="The problem" className="py-20 md:py-28 border-t border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            The vibe coding quality gap is{" "}
            <span className="text-red-400">real</span>
          </h2>
          <p className="mt-4 text-lg text-neutral-300 max-w-2xl mx-auto">
            AI can generate features in minutes. But accessibility, security, and performance
            are afterthoughts — until they become lawsuits and outages.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8">
              <p className="text-4xl md:text-5xl font-bold text-red-400">95%</p>
              <p className="mt-2 text-sm text-neutral-300">
                of vibe-coded apps fail WCAG accessibility standards
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8">
              <p className="text-4xl md:text-5xl font-bold text-orange-400">37%</p>
              <p className="mt-2 text-sm text-neutral-300">
                surge in ADA lawsuits in 2025 targeting web applications
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8">
              <p className="text-4xl md:text-5xl font-bold text-yellow-400">$75K</p>
              <p className="mt-2 text-sm text-neutral-300">
                average cost of an ADA lawsuit settlement for small businesses
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* HOW IT WORKS                                                 */}
      {/* ============================================================ */}
      <section aria-label="How it works" className="py-20 md:py-28 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Three steps to <span className="text-gradient">ship with confidence</span>
            </h2>
            <p className="mt-4 text-lg text-neutral-300">
              Scan any URL. Get a detailed report. Fix issues with copy-paste code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {steps.map((s, i) => (
              <div key={s.step} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-neutral-700 to-transparent z-0" aria-hidden="true" />
                )}
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 text-xl font-bold mb-4">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-orange-500" aria-hidden="true" />
              <span className="text-sm text-neutral-300">Or use the API directly</span>
            </div>
            <CodeBlock code={apiExample} language="bash" copyable title="API Example" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FEATURES                                                     */}
      {/* ============================================================ */}
      <section id="features" className="py-20 md:py-28 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Everything you need to <span className="text-gradient">ship quality</span>
            </h2>
            <p className="mt-4 text-lg text-neutral-300">
              Comprehensive scanning across three critical dimensions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-neutral-800 bg-neutral-900 p-6 hover:border-orange-500/30 hover:bg-neutral-800/80 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 mb-4 group-hover:bg-orange-500/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-300 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PRICING                                                      */}
      {/* ============================================================ */}
      <section id="pricing" className="py-20 md:py-28 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-neutral-300">
              Start free. Scale as you grow. No hidden fees.
            </p>
          </div>
          <PricingTable />
        </div>
      </section>

      {/* ============================================================ */}
      {/* PLATFORM HIGHLIGHTS                                          */}
      {/* ============================================================ */}
      <section aria-label="Platform highlights" className="py-20 md:py-28 border-t border-neutral-800 bg-neutral-900/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
            <div>
              <p className="text-5xl md:text-6xl font-bold tabular-nums text-orange-400">200+</p>
              <p className="mt-2 text-neutral-300">checks per scan</p>
            </div>
            <div>
              <p className="text-5xl md:text-6xl font-bold tabular-nums text-white">&lt;30s</p>
              <p className="mt-2 text-neutral-300">results delivered</p>
            </div>
            <div>
              <p className="text-5xl md:text-6xl font-bold tabular-nums text-green-400">3</p>
              <p className="mt-2 text-neutral-300">audit dimensions covered</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FINAL CTA                                                    */}
      {/* ============================================================ */}
      <section aria-label="Call to action" className="py-20 md:py-28 border-t border-neutral-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            The average ADA lawsuit costs{" "}
            <span className="text-red-400">$25,000 - $75,000</span>.
            <br />
            PreShip costs{" "}
            <span className="text-gradient">$29/month</span>.
          </h2>
          <p className="mt-6 text-lg text-neutral-300">
            Stop shipping inaccessible, insecure apps. Start scanning in 30 seconds.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/signup?plan=free">
              <Button size="lg" className="px-8">
                Start scanning free
              </Button>
            </a>
            <a href="/docs">
              <Button variant="outline" size="lg" className="px-8">
                View documentation
              </Button>
            </a>
          </div>
        </div>
      </section>

      </main>

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}
      <footer role="contentinfo" className="border-t border-neutral-800 bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-white">PreShip</span>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Quality gate for AI-generated code. Scan, fix, and ship with confidence.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-neutral-300">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/docs" className="hover:text-white transition-colors">API Docs</a></li>
                <li><a href="/changelog" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-neutral-300">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-neutral-300">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="/dpa" className="hover:text-white transition-colors">DPA</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-neutral-400">
              &copy; {new Date().getFullYear()} PreShip. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://twitter.com/preshipdev" aria-label="PreShip on X (Twitter)" className="text-neutral-300 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://github.com/preship" aria-label="PreShip on GitHub" className="text-neutral-300 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
