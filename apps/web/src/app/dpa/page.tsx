import Navbar from "@/components/Navbar";

export default function DpaPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-32 pb-20">
        <h1 className="text-4xl font-bold text-white mb-4">Data Processing Agreement</h1>
        <p className="text-sm text-neutral-500 mb-12">Last updated: March 1, 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Definitions</h2>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li>
                <strong className="text-white">Data Controller</strong> (&quot;Customer&quot;): The entity that determines the purposes and means of processing personal data by using PreShip services.
              </li>
              <li>
                <strong className="text-white">Data Processor</strong> (&quot;PreShip&quot;): PreShip, which processes personal data on behalf of the Customer in connection with the provision of the services.
              </li>
              <li>
                <strong className="text-white">Personal Data</strong>: Any information relating to an identified or identifiable natural person that is processed by PreShip on behalf of the Customer.
              </li>
              <li>
                <strong className="text-white">Sub-processor</strong>: Any third party engaged by PreShip to process personal data on behalf of the Customer.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Scope and Purpose of Processing</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">
              PreShip processes personal data solely to provide the services described in the
              applicable service agreement. The types of data processed and purposes include:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li>Account information (name, email) for authentication and account management</li>
              <li>URLs submitted for scanning to perform accessibility, security, and performance analysis</li>
              <li>Scan results and reports for display in the dashboard and API responses</li>
              <li>Usage data for billing, support, and service improvement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Obligations of the Processor</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">PreShip shall:</p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li>Process personal data only on documented instructions from the Customer</li>
              <li>Ensure that persons authorized to process personal data are bound by confidentiality obligations</li>
              <li>Implement appropriate technical and organizational security measures</li>
              <li>Assist the Customer in responding to data subject access requests</li>
              <li>Delete or return all personal data upon termination of the service agreement, at the Customer&apos;s election</li>
              <li>Make available all information necessary to demonstrate compliance with these obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Security Measures</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">
              PreShip implements the following technical and organizational measures to protect personal data:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li>Encryption in transit (TLS 1.3) and at rest (AES-256)</li>
              <li>Network-level isolation and firewall protection via Cloudflare</li>
              <li>Access controls with role-based permissions and multi-factor authentication</li>
              <li>Regular security assessments and vulnerability scanning</li>
              <li>Automated backup systems with encrypted storage</li>
              <li>Incident response procedures with 72-hour breach notification</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Sub-processors</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">
              PreShip engages the following sub-processors to deliver its services. The Customer
              will be notified at least 30 days before any new sub-processor is engaged.
            </p>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left px-4 py-3 text-neutral-400 font-medium">Sub-processor</th>
                    <th className="text-left px-4 py-3 text-neutral-400 font-medium">Purpose</th>
                    <th className="text-left px-4 py-3 text-neutral-400 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-300">
                  <tr className="border-b border-neutral-800">
                    <td className="px-4 py-3">Railway</td>
                    <td className="px-4 py-3">Infrastructure hosting</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr className="border-b border-neutral-800">
                    <td className="px-4 py-3">Cloudflare</td>
                    <td className="px-4 py-3">CDN, DDoS protection, DNS</td>
                    <td className="px-4 py-3">Global</td>
                  </tr>
                  <tr className="border-b border-neutral-800">
                    <td className="px-4 py-3">Neon</td>
                    <td className="px-4 py-3">PostgreSQL database hosting</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr className="border-b border-neutral-800">
                    <td className="px-4 py-3">Stripe</td>
                    <td className="px-4 py-3">Payment processing</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Resend</td>
                    <td className="px-4 py-3">Transactional email delivery</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Data Subject Rights</h2>
            <p className="text-neutral-300 leading-relaxed">
              PreShip will assist the Customer in fulfilling its obligations to respond to data
              subject requests, including rights of access, rectification, erasure, restriction,
              portability, and objection. PreShip will promptly notify the Customer if it receives
              a data subject request directly, unless prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data Breach Notification</h2>
            <p className="text-neutral-300 leading-relaxed">
              In the event of a personal data breach, PreShip will notify the Customer without
              undue delay and in any event within 72 hours of becoming aware of the breach. The
              notification will include the nature of the breach, categories of data affected,
              approximate number of data subjects affected, and measures taken to address the
              breach.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. International Transfers</h2>
            <p className="text-neutral-300 leading-relaxed">
              Personal data is primarily processed in the United States. Where personal data is
              transferred outside the European Economic Area, PreShip ensures appropriate
              safeguards are in place, including Standard Contractual Clauses approved by the
              European Commission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Data Retention</h2>
            <p className="text-neutral-300 leading-relaxed mb-3">
              Scan data is retained according to the Customer&apos;s subscription plan:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-2">
              <li><strong className="text-white">Free:</strong> 7 days</li>
              <li><strong className="text-white">Pro:</strong> 90 days</li>
              <li><strong className="text-white">Team:</strong> 1 year</li>
              <li><strong className="text-white">Enterprise:</strong> Unlimited retention</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed mt-3">
              Account and billing data is retained for the duration of the service agreement and for
              any additional period required by applicable law (e.g., tax and accounting obligations).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Term and Termination</h2>
            <p className="text-neutral-300 leading-relaxed">
              This DPA is effective for the duration of the service agreement between the Customer
              and PreShip. Upon termination, PreShip will delete all personal data within 30 days,
              unless retention is required by applicable law. The Customer may request a copy of
              their data before deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contact</h2>
            <p className="text-neutral-300 leading-relaxed">
              For questions about this Data Processing Agreement or to request a signed copy,
              please contact us at{" "}
              <a
                href="mailto:legal@preship.dev"
                className="text-orange-400 hover:text-orange-300 transition-colors"
              >
                legal@preship.dev
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
