import Navbar from "@/components/Navbar";
import CodeBlock from "@/components/CodeBlock";

const curlExample = `curl -X POST https://api.preship.dev/v1/scans \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.vercel.app",
    "checks": ["accessibility", "security", "performance"]
  }'`;

const responseExample = `{
  "id": "scan_abc123",
  "status": "completed",
  "url": "https://your-app.vercel.app",
  "score": 72,
  "accessibility": 58,
  "security": 89,
  "performance": 71,
  "violations": 23,
  "fixable": 18,
  "created_at": "2026-03-16T14:30:00Z",
  "completed_at": "2026-03-16T14:30:28Z"
}`;

const webhookExample = `// POST to your webhook URL
{
  "event": "scan.completed",
  "data": {
    "id": "scan_abc123",
    "score": 72,
    "violations": 23
  }
}`;

const getScanExample = `curl https://api.preship.dev/v1/scans/scan_abc123 \\
  -H "Authorization: Bearer sk_live_..."`;

const listScansExample = `curl "https://api.preship.dev/v1/scans?limit=10&offset=0" \\
  -H "Authorization: Bearer sk_live_..."`;

const sections = [
  {
    id: "authentication",
    title: "Authentication",
    content: "All API requests require a Bearer token in the Authorization header. You can generate API keys from your dashboard under Settings > API Keys.",
  },
  {
    id: "create-scan",
    title: "Create a Scan",
    description: "Start a new scan by sending a POST request with the target URL and desired checks.",
    endpoint: "POST /v1/scans",
    code: curlExample,
    language: "bash",
  },
  {
    id: "scan-response",
    title: "Scan Response",
    description: "When the scan completes, you will receive a response with scores and violation counts.",
    code: responseExample,
    language: "json",
  },
  {
    id: "get-scan",
    title: "Get Scan Details",
    description: "Retrieve detailed results for a specific scan by its ID.",
    endpoint: "GET /v1/scans/:id",
    code: getScanExample,
    language: "bash",
  },
  {
    id: "list-scans",
    title: "List Scans",
    description: "Retrieve a paginated list of your scans.",
    endpoint: "GET /v1/scans",
    code: listScansExample,
    language: "bash",
  },
  {
    id: "webhooks",
    title: "Webhooks",
    description: "Configure a webhook URL in your dashboard to receive real-time notifications when scans complete.",
    code: webhookExample,
    language: "json",
  },
];

const sidebarLinks = [
  { label: "Getting Started", href: "#getting-started" },
  { label: "Authentication", href: "#authentication" },
  { label: "Create a Scan", href: "#create-scan" },
  { label: "Scan Response", href: "#scan-response" },
  { label: "Get Scan Details", href: "#get-scan" },
  { label: "List Scans", href: "#list-scans" },
  { label: "Webhooks", href: "#webhooks" },
  { label: "Rate Limits", href: "#rate-limits" },
  { label: "Error Codes", href: "#error-codes" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">On this page</h3>
              <nav className="space-y-1">
                {sidebarLinks.map((link) => (
                  <a key={link.href} href={link.href} className="block text-sm text-neutral-400 hover:text-orange-400 transition-colors py-1.5">
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-white mb-4">API Documentation</h1>
            <p className="text-lg text-neutral-300 mb-12">
              Integrate PreShip scanning into your workflow with our REST API. Automate accessibility,
              security, and performance checks in your CI/CD pipeline.
            </p>

            <section id="getting-started" className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-4">Getting Started</h2>
              <p className="text-neutral-300 mb-4">
                The PreShip API is organized around REST. It accepts JSON-encoded request bodies,
                returns JSON-encoded responses, and uses standard HTTP response codes.
              </p>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 mb-4">
                <p className="text-sm font-mono text-orange-400">Base URL: https://api.preship.dev/v1</p>
              </div>
            </section>

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-4">{section.title}</h2>
                {section.content && <p className="text-neutral-300 mb-4">{section.content}</p>}
                {section.description && <p className="text-neutral-300 mb-4">{section.description}</p>}
                {section.endpoint && (
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 mb-4 inline-block">
                    <code className="text-sm font-mono text-orange-400">{section.endpoint}</code>
                  </div>
                )}
                {section.code && (
                  <CodeBlock code={section.code} language={section.language || "text"} copyable />
                )}
              </section>
            ))}

            <section id="rate-limits" className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-4">Rate Limits</h2>
              <p className="text-neutral-300 mb-4">
                API rate limits depend on your plan. Rate limit headers are included in every response.
              </p>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800">
                      <th className="text-left px-4 py-3 text-neutral-400 font-medium">Plan</th>
                      <th className="text-left px-4 py-3 text-neutral-400 font-medium">Requests/min</th>
                      <th className="text-left px-4 py-3 text-neutral-400 font-medium">Scans/month</th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-300">
                    <tr className="border-b border-neutral-800"><td className="px-4 py-3">Free</td><td className="px-4 py-3">10</td><td className="px-4 py-3">5</td></tr>
                    <tr className="border-b border-neutral-800"><td className="px-4 py-3">Pro</td><td className="px-4 py-3">60</td><td className="px-4 py-3">100</td></tr>
                    <tr className="border-b border-neutral-800"><td className="px-4 py-3">Team</td><td className="px-4 py-3">120</td><td className="px-4 py-3">500</td></tr>
                    <tr><td className="px-4 py-3">Business</td><td className="px-4 py-3">300</td><td className="px-4 py-3">Unlimited</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="error-codes" className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-4">Error Codes</h2>
              <p className="text-neutral-300 mb-4">
                PreShip uses conventional HTTP response codes. Codes in the 2xx range indicate success,
                4xx indicate client errors, and 5xx indicate server errors.
              </p>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800">
                      <th className="text-left px-4 py-3 text-neutral-400 font-medium">Code</th>
                      <th className="text-left px-4 py-3 text-neutral-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-300">
                    <tr className="border-b border-neutral-800"><td className="px-4 py-3 font-mono text-green-400">200</td><td className="px-4 py-3">Success</td></tr>
                    <tr className="border-b border-neutral-800"><td className="px-4 py-3 font-mono text-green-400">201</td><td className="px-4 py-3">Scan created successfully</td></tr>
                    <tr className="border-b border-neutral-800"><td className="px-4 py-3 font-mono text-yellow-400">400</td><td className="px-4 py-3">Bad request - invalid parameters</td></tr>
                    <tr className="border-b border-neutral-800"><td className="px-4 py-3 font-mono text-yellow-400">401</td><td className="px-4 py-3">Unauthorized - invalid or missing API key</td></tr>
                    <tr className="border-b border-neutral-800"><td className="px-4 py-3 font-mono text-yellow-400">403</td><td className="px-4 py-3">Forbidden - insufficient permissions</td></tr>
                    <tr className="border-b border-neutral-800"><td className="px-4 py-3 font-mono text-yellow-400">404</td><td className="px-4 py-3">Not found - scan or resource does not exist</td></tr>
                    <tr className="border-b border-neutral-800"><td className="px-4 py-3 font-mono text-orange-400">429</td><td className="px-4 py-3">Rate limit exceeded</td></tr>
                    <tr><td className="px-4 py-3 font-mono text-red-400">500</td><td className="px-4 py-3">Internal server error</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
