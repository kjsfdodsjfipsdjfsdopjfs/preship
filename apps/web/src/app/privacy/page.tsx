import Navbar from "@/components/Navbar";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
        <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
        <p className="text-sm text-neutral-500 mb-12">Last updated: March 1, 2026</p>

        <div className="prose-custom space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p className="text-neutral-300 leading-relaxed">
              PreShip (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our
              website and services at preship.dev.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">We may collect the following types of information:</p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li>Account information: name, email address, and password when you create an account</li>
              <li>Usage data: URLs you submit for scanning, scan results, and feature usage patterns</li>
              <li>Technical data: browser type, IP address, device information, and cookies</li>
              <li>Payment information: billing details processed securely through our payment provider</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li>To provide and maintain our scanning services</li>
              <li>To process your transactions and manage your account</li>
              <li>To send you service-related communications and updates</li>
              <li>To improve our services and develop new features</li>
              <li>To detect, prevent, and address technical issues or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Retention</h2>
            <p className="text-neutral-300 leading-relaxed">
              We retain your scan data for as long as your account is active or as needed to provide
              our services. You can request deletion of your data at any time by contacting us at
              privacy@preship.dev.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Sharing</h2>
            <p className="text-neutral-300 leading-relaxed">
              We do not sell your personal information. We may share data with trusted third-party
              service providers who assist in operating our services, subject to confidentiality
              obligations. We may also disclose data if required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Security</h2>
            <p className="text-neutral-300 leading-relaxed">
              We implement industry-standard security measures to protect your information, including
              encryption in transit (TLS) and at rest, regular security audits, and access controls.
              However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Cookies</h2>
            <p className="text-neutral-300 leading-relaxed">
              We use essential cookies to maintain your session and preferences. We also use analytics
              cookies to understand how you use our services. You can control cookie preferences
              through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Contact Us</h2>
            <p className="text-neutral-300 leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:privacy@preship.dev" className="text-orange-400 hover:text-orange-300 transition-colors">privacy@preship.dev</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
