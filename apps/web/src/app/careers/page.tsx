import Navbar from "@/components/Navbar";

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
        <h1 className="text-4xl font-bold text-white mb-4">Join PreShip</h1>
        <p className="text-lg text-neutral-300 mb-12">
          Help us make AI-generated code accessible, secure, and performant for everyone.
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Our Mission</h2>
            <p className="text-neutral-300 leading-relaxed">
              AI is changing how software gets built. Millions of apps are being generated every
              month, and the vast majority of them ship with accessibility violations, security
              vulnerabilities, and performance problems. We are building the quality gate that
              catches these issues before they reach users. If you care about making the web
              better for everyone, we would love to talk to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What We Value</h2>
            <ul className="space-y-3 ml-1">
              {[
                "Ship fast, but ship quality — we practice what we preach",
                "Accessibility is not optional — it is a core engineering requirement",
                "Work in the open — we build in public and share what we learn",
                "Small team, big ownership — every person shapes the product",
              ].map((value, i) => (
                <li key={i} className="flex items-start gap-3 text-neutral-300">
                  <svg className="w-4 h-4 text-orange-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm leading-relaxed">{value}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No open positions right now</h3>
            <p className="text-neutral-300 text-sm leading-relaxed max-w-md mx-auto mb-4">
              We do not have any open roles at the moment, but we are always looking for talented
              people who are passionate about web quality and accessibility.
            </p>
            <p className="text-sm text-neutral-300">
              Drop us a line at{" "}
              <a
                href="mailto:careers@preship.dev"
                className="text-orange-400 hover:text-orange-300 transition-colors font-medium"
              >
                careers@preship.dev
              </a>{" "}
              and tell us what you would bring to the team.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
