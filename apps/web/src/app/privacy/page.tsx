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
            <p className="text-neutral-300 leading-relaxed mb-3">
              Scan data retention periods depend on your subscription plan:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li><strong className="text-white">Free:</strong> Scan history retained for 7 days</li>
              <li><strong className="text-white">Pro:</strong> Scan history retained for 90 days</li>
              <li><strong className="text-white">Team:</strong> Scan history retained for 1 year</li>
              <li><strong className="text-white">Enterprise:</strong> Unlimited retention</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed mt-3">
              Account information is retained for as long as your account is active. Upon account
              deletion, all personal data is removed within 30 days, except where retention is
              required by law. You can request deletion of your data at any time by contacting us
              at{" "}
              <a href="mailto:support@preship.dev" className="text-orange-400 hover:text-orange-300 transition-colors">support@preship.dev</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Sharing and Sub-processors</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">
              We do not sell your personal information. We share data only with trusted third-party
              service providers (sub-processors) who assist in operating our services, subject to
              confidentiality and data processing obligations. We may also disclose data if required
              by law. Our current sub-processors include:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li><strong className="text-white">Railway</strong> — Infrastructure hosting (United States)</li>
              <li><strong className="text-white">Cloudflare</strong> — DNS, CDN, and DDoS protection (Global)</li>
              <li><strong className="text-white">Stripe</strong> — Payment processing (United States)</li>
              <li><strong className="text-white">Neon</strong> — PostgreSQL database hosting (United States)</li>
              <li><strong className="text-white">Resend</strong> — Transactional email delivery (United States)</li>
            </ul>
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
            <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights (GDPR and Applicable Law)</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">
              Under the General Data Protection Regulation (GDPR) and other applicable data protection
              laws, you have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li><strong className="text-white">Right to Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong className="text-white">Right to Rectification:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong className="text-white">Right to Erasure:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
              <li><strong className="text-white">Right to Restrict Processing:</strong> Request that we limit how we use your data</li>
              <li><strong className="text-white">Right to Data Portability:</strong> Receive your data in a structured, machine-readable format and transfer it to another provider</li>
              <li><strong className="text-white">Right to Object:</strong> Object to processing based on legitimate interests or for direct marketing</li>
              <li><strong className="text-white">Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:support@preship.dev" className="text-orange-400 hover:text-orange-300 transition-colors">support@preship.dev</a>.
              We will respond to your request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Cookies and Consent</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">
              We use cookies and similar tracking technologies to operate and improve our services:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li><strong className="text-white">Essential Cookies:</strong> Required for authentication, session management, and core functionality. These cannot be disabled.</li>
              <li><strong className="text-white">Analytics Cookies:</strong> Help us understand how you use our services and improve the user experience. These are only set with your consent.</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed mt-3">
              When you first visit PreShip, you will be presented with a cookie consent banner where
              you can accept or decline non-essential cookies. You can update your cookie preferences
              at any time through your browser settings or by contacting us. Essential cookies are
              necessary for the Service to function and are set regardless of your consent preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Contact Us</h2>
            <p className="text-neutral-300 leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:support@preship.dev" className="text-orange-400 hover:text-orange-300 transition-colors">support@preship.dev</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
