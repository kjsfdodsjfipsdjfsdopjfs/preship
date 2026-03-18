import Navbar from "@/components/Navbar";

const practices = [
  {
    title: "Encryption",
    description:
      "All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. API keys are hashed and never stored in plaintext.",
  },
  {
    title: "Infrastructure",
    description:
      "PreShip runs on Railway with Cloudflare in front for DDoS protection and edge caching. All infrastructure is hosted in SOC 2 Type II certified data centers.",
  },
  {
    title: "Authentication",
    description:
      "We support OAuth 2.0 via GitHub and Google, secure session management with automatic rotation, and enforce rate limiting on all authentication endpoints.",
  },
  {
    title: "Access Control",
    description:
      "Internal access follows the principle of least privilege. All production access requires multi-factor authentication and is logged for audit purposes.",
  },
  {
    title: "Data Isolation",
    description:
      "Customer scan data is logically isolated. Scan results are tied to your account and are never shared with other customers or used for training purposes.",
  },
  {
    title: "Dependency Management",
    description:
      "We run automated dependency scanning on every commit. Known vulnerabilities are patched within 24 hours for critical issues and 7 days for non-critical.",
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
        <h1 className="text-4xl font-bold text-white mb-4">Security</h1>
        <p className="text-lg text-neutral-300 mb-12">
          Security is foundational to everything we build. Here is how we protect your data.
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Security Practices</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {practices.map((practice) => (
                <div
                  key={practice.title}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"
                >
                  <h3 className="text-sm font-semibold text-white mb-2">{practice.title}</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">{practice.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Compliance</h2>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              <ul className="space-y-3">
                {[
                  "SOC 2 Type II certification is in progress and expected by Q3 2026",
                  "GDPR compliant — we process data lawfully and honor deletion requests",
                  "Data Processing Agreement (DPA) available for enterprise customers",
                  "Regular third-party penetration testing conducted quarterly",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-300">
                    <svg className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Vulnerability Disclosure</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              We take security vulnerabilities seriously. If you have discovered a security issue
              in PreShip, we appreciate your help in disclosing it to us responsibly.
            </p>
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-6">
              <h3 className="text-sm font-semibold text-white mb-2">Report a Vulnerability</h3>
              <p className="text-sm text-neutral-300 mb-3">
                Please report security vulnerabilities by emailing us at{" "}
                <a
                  href="mailto:security@preship.dev"
                  className="text-orange-400 hover:text-orange-300 transition-colors font-medium"
                >
                  security@preship.dev
                </a>
                . Include a detailed description of the vulnerability, steps to reproduce, and any
                relevant proof of concept.
              </p>
              <p className="text-sm text-neutral-300">
                We will acknowledge your report within 24 hours and aim to provide a fix or
                mitigation within 72 hours for critical issues. We do not currently offer a bug
                bounty program, but we will publicly credit researchers who report valid
                vulnerabilities (with your permission).
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Questions?</h2>
            <p className="text-neutral-300 leading-relaxed">
              If you have questions about our security practices, please contact us at{" "}
              <a
                href="mailto:security@preship.dev"
                className="text-orange-400 hover:text-orange-300 transition-colors"
              >
                security@preship.dev
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
