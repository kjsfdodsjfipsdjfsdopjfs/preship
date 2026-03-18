import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = {
  title: "Badge",
  description:
    "Embed a PreShip quality score badge in your README, docs, or website.",
};

const markdownExample = `[![PreShip Score](https://preship.dev/badge/yoursite.com)](https://preship.dev/scan/yoursite.com)`;

const htmlExample = `<a href="https://preship.dev/scan/yoursite.com">
  <img src="https://preship.dev/badge/yoursite.com" alt="PreShip Score" />
</a>`;

const rstExample = `.. image:: https://preship.dev/badge/yoursite.com
   :target: https://preship.dev/scan/yoursite.com
   :alt: PreShip Score`;

export default function BadgePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-4">PreShip Badge</h1>
        <p className="text-neutral-400 text-lg mb-10">
          Show your quality score anywhere — READMEs, docs, landing pages. The
          badge updates automatically with your latest scan.
        </p>

        {/* Live preview */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          <div className="flex items-center gap-6 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <div className="flex flex-col items-center gap-2">
              <img
                src="/badge/example.com"
                alt="Example badge"
                className="h-5"
              />
              <span className="text-xs text-neutral-500">Live badge</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              {/* Inline SVG for "not scanned" preview */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="130"
                height="20"
                role="img"
              >
                <clipPath id="r">
                  <rect width="130" height="20" rx="3" fill="#fff" />
                </clipPath>
                <g clipPath="url(#r)">
                  <rect width="52" height="20" fill="#F97316" />
                  <rect x="52" width="78" height="20" fill="#555" />
                </g>
                <g
                  fill="#fff"
                  textAnchor="middle"
                  fontFamily="Verdana,Geneva,sans-serif"
                  fontSize="11"
                >
                  <text x="26" y="14" fillOpacity=".3" fill="#010101">
                    PreShip
                  </text>
                  <text x="26" y="13">
                    PreShip
                  </text>
                  <text x="91" y="14" fillOpacity=".3" fill="#010101">
                    not scanned
                  </text>
                  <text x="91" y="13">
                    not scanned
                  </text>
                </g>
              </svg>
              <span className="text-xs text-neutral-500">Not scanned</span>
            </div>
          </div>
        </section>

        {/* Usage */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-2">Endpoint</h2>
          <p className="text-neutral-400 mb-4">
            Replace <code className="text-orange-400">yoursite.com</code> with
            your domain. The <code className="text-orange-400">.svg</code>{" "}
            extension is optional.
          </p>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 font-mono text-sm text-neutral-300 mb-6">
            https://preship.dev/badge/<span className="text-orange-400">yoursite.com</span>
          </div>
        </section>

        {/* Embed examples */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Embed Examples</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-neutral-300 mb-2">
                Markdown (GitHub, GitLab, etc.)
              </h3>
              <CodeBlock code={markdownExample} language="markdown" />
            </div>

            <div>
              <h3 className="text-sm font-medium text-neutral-300 mb-2">
                HTML
              </h3>
              <CodeBlock code={htmlExample} language="html" />
            </div>

            <div>
              <h3 className="text-sm font-medium text-neutral-300 mb-2">
                reStructuredText
              </h3>
              <CodeBlock code={rstExample} language="text" />
            </div>
          </div>
        </section>

        {/* Score colors */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Score Colors</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-center">
              <div className="inline-block w-4 h-4 rounded-full bg-green-500 mb-2" />
              <p className="text-sm font-medium">Green</p>
              <p className="text-xs text-neutral-500">Score above 80</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-center">
              <div className="inline-block w-4 h-4 rounded-full bg-yellow-500 mb-2" />
              <p className="text-sm font-medium">Yellow</p>
              <p className="text-xs text-neutral-500">Score 50 &ndash; 80</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-center">
              <div className="inline-block w-4 h-4 rounded-full bg-red-500 mb-2" />
              <p className="text-sm font-medium">Red</p>
              <p className="text-xs text-neutral-500">Score below 50</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <ul className="space-y-3 text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-orange-500 font-bold mt-0.5">1.</span>
              <span>
                The badge endpoint fetches the latest scan for your domain from
                the PreShip API.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-orange-500 font-bold mt-0.5">2.</span>
              <span>
                It returns an SVG image with your current score and a color
                indicating quality level.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-orange-500 font-bold mt-0.5">3.</span>
              <span>
                Results are cached for 1 hour. New scans will update the badge
                automatically.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-orange-500 font-bold mt-0.5">4.</span>
              <span>
                If the domain hasn&apos;t been scanned yet, a gray &ldquo;not
                scanned&rdquo; badge is shown.
              </span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
