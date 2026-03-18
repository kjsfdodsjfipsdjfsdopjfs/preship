import Navbar from "@/components/Navbar";

const stats = [
  { value: "2.8M+", label: "Violations detected" },
  { value: "184K+", label: "Apps scanned" },
  { value: "200+", label: "Checks per scan" },
  { value: "<30s", label: "Average scan time" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
        <h1 className="text-4xl font-bold text-white mb-4">About PreShip</h1>
        <p className="text-lg text-orange-400 font-medium mb-12">
          Making AI-generated code accessible, secure, and performant.
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">The Problem</h2>
            <p className="text-neutral-300 leading-relaxed">
              AI code generation tools have made it possible for anyone to build and ship web
              applications in hours instead of weeks. But speed comes at a cost. The vast majority
              of AI-generated apps fail basic accessibility standards, ship with security
              vulnerabilities, and perform poorly on real devices. The developers using these tools
              are moving fast, but they are often unaware of the issues they are shipping to
              production.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What We Do</h2>
            <p className="text-neutral-300 leading-relaxed">
              PreShip is an automated quality gate for web applications. We scan any URL against
              200+ checks covering WCAG 2.2 accessibility compliance, OWASP Top 10 security
              vulnerabilities, and Core Web Vitals performance metrics. Every violation comes with
              a severity rating, a detailed explanation, and a concrete code fix you can copy and
              paste into your project.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How We Work</h2>
            <p className="text-neutral-300 leading-relaxed">
              We are API-first. You can scan from your browser, integrate PreShip into your CI/CD
              pipeline, or call our REST API directly. Results come back in under 30 seconds. Set
              score thresholds and fail builds that do not meet your standards. Export PDF compliance
              reports for legal review, client deliverables, or internal audits. Our goal is to make
              quality as easy to check as running a linter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Our Team</h2>
            <p className="text-neutral-300 leading-relaxed">
              PreShip was founded by developers who were frustrated with shipping inaccessible
              AI-generated code. After seeing yet another vibe-coded app fail a basic screen reader
              test, we decided to build the tool we wished existed: a fast, automated way to catch
              quality issues before they reach users. We are a small, focused team building in
              public and iterating quickly based on developer feedback.
            </p>
          </section>
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
              <p className="text-2xl font-bold text-orange-400">{stat.value}</p>
              <p className="mt-1 text-xs text-neutral-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
