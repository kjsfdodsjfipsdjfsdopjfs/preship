/**
 * PreShip GitHub Action
 *
 * Runs accessibility, security, and performance scans on a deployed URL
 * and reports results as GitHub Action outputs and annotations.
 *
 * Usage in a workflow:
 *   - uses: ./.github/actions/accessibility-scan
 *     with:
 *       url: https://your-app.com
 *       api-key: ${{ secrets.PRESHIP_API_KEY }}
 */

interface ActionInputs {
  url: string;
  apiKey?: string;
  categories: string;
  maxPages: number;
  failOnCritical: boolean;
}

function getInputs(): ActionInputs {
  return {
    url: process.env.INPUT_URL || "",
    apiKey: process.env["INPUT_API-KEY"] || undefined,
    categories:
      process.env.INPUT_CATEGORIES || "accessibility,security,performance",
    maxPages: parseInt(process.env["INPUT_MAX-PAGES"] || "5", 10),
    failOnCritical: process.env["INPUT_FAIL-ON-CRITICAL"] !== "false",
  };
}

async function run(): Promise<void> {
  const inputs = getInputs();

  if (!inputs.url) {
    console.error("::error::URL input is required");
    process.exit(1);
  }

  console.log(`Scanning ${inputs.url}...`);
  console.log(`Categories: ${inputs.categories}`);
  console.log(`Max pages: ${inputs.maxPages}`);

  try {
    // If API key is provided, use the PreShip API
    if (inputs.apiKey) {
      const apiUrl =
        process.env.PRESHIP_API_URL || "https://api.preship.dev";

      const response = await fetch(`${apiUrl}/api/scans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": inputs.apiKey,
        },
        body: JSON.stringify({
          url: inputs.url,
          options: {
            categories: inputs.categories.split(",").map((c) => c.trim()),
            maxPages: inputs.maxPages,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      console.log(`Scan queued: ${result.id}`);

      // TODO: Poll for results
      console.log(`::set-output name=score::pending`);
      console.log(`::set-output name=violations::pending`);
      console.log(
        `::set-output name=report-url::${apiUrl}/reports/${result.id}`
      );
    } else {
      // Run scanner locally
      // This requires puppeteer to be available in the action environment
      console.log(
        "No API key provided. To use the API, set the api-key input."
      );
      console.log(
        "For local scanning, install @preship/scanner as a dependency."
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`::error::Scan failed: ${message}`);
    process.exit(1);
  }
}

run();
