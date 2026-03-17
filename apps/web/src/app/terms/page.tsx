import Navbar from "@/components/Navbar";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
        <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
        <p className="text-sm text-neutral-500 mb-12">Last updated: March 1, 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Agreement to Terms</h2>
            <p className="text-neutral-300 leading-relaxed">
              By accessing or using PreShip (&quot;the Service&quot;), you agree to be bound by these Terms of
              Service. If you do not agree, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p className="text-neutral-300 leading-relaxed">
              PreShip provides automated accessibility, security, and performance scanning for web
              applications. The Service includes a web-based dashboard, REST API, and reporting tools.
              Features may vary based on your subscription plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Account Registration</h2>
            <p className="text-neutral-300 leading-relaxed">
              To use certain features, you must create an account. You are responsible for maintaining
              the security of your account credentials and for all activity under your account. You
              must provide accurate and complete information during registration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Acceptable Use</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li>Use the Service to scan websites you do not own or have authorization to test</li>
              <li>Attempt to circumvent rate limits or usage quotas</li>
              <li>Reverse-engineer, decompile, or disassemble any part of the Service</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Transmit malicious code or interfere with the Service&apos;s infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Subscription and Billing</h2>
            <p className="text-neutral-300 leading-relaxed">
              Paid plans are billed monthly or annually. You may cancel your subscription at any time,
              and cancellation will take effect at the end of the current billing period. We reserve
              the right to modify pricing with 30 days notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Intellectual Property</h2>
            <p className="text-neutral-300 leading-relaxed">
              The Service, including its design, code, and documentation, is owned by PreShip and
              protected by intellectual property laws. Your scan results and data remain your property.
              You grant us a limited license to process your data solely to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Disclaimer of Warranties</h2>
            <p className="text-neutral-300 leading-relaxed">
              The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that
              scan results are exhaustive or that following our recommendations will make your
              application fully compliant with any standard or regulation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p className="text-neutral-300 leading-relaxed">
              To the maximum extent permitted by law, PreShip shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the Service,
              including but not limited to loss of data, revenue, or business opportunities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Termination</h2>
            <p className="text-neutral-300 leading-relaxed">
              We reserve the right to suspend or terminate your account if you violate these Terms.
              Upon termination, your right to use the Service ceases immediately. You may export your
              data before termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Changes to Terms</h2>
            <p className="text-neutral-300 leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes via
              email or through the Service. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contact</h2>
            <p className="text-neutral-300 leading-relaxed">
              For questions about these Terms, contact us at{" "}
              <a href="mailto:legal@preship.dev" className="text-orange-400 hover:text-orange-300 transition-colors">legal@preship.dev</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
