import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs";
import {
  createScan,
  pollScanUntilComplete,
  ApiClientError,
  getConfig,
} from "../utils/api";
import {
  renderFullReport,
  renderJson,
  renderTable,
} from "../utils/display";

interface ScanCommandOptions {
  checks?: string;
  pages?: string;
  maxPages?: string;
  format?: string;
  failUnder?: string;
  apiKey?: string;
  local?: boolean;
  output?: string;
}

export function registerScanCommand(program: Command): void {
  program
    .command("scan <url>")
    .description("Scan a URL for accessibility, security, and performance issues")
    .option(
      "--checks <checks>",
      "Comma-separated checks to run (accessibility,security,performance)",
      "accessibility,security,performance"
    )
    .option("--pages <pages>", "Comma-separated specific page URLs to scan")
    .option("--max-pages <n>", "Maximum number of pages to crawl", "10")
    .option(
      "--format <format>",
      "Output format: summary, json, table",
      "summary"
    )
    .option(
      "--fail-under <score>",
      "Exit with code 1 if overall score is below this threshold"
    )
    .option("--api-key <key>", "API key (or use PRESHIP_API_KEY env var)")
    .option("--local", "Run scan locally instead of via API", false)
    .option("--output <file>", "Save results to a file")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  ${chalk.dim("# Basic scan")}
  $ preship scan https://myapp.com

  ${chalk.dim("# Accessibility only, fail if below 80")}
  $ preship scan https://myapp.com --checks accessibility --fail-under 80

  ${chalk.dim("# Scan specific pages and output JSON")}
  $ preship scan https://myapp.com --pages /,/about,/contact --format json

  ${chalk.dim("# Local scan (no API key required)")}
  $ preship scan https://myapp.com --local

  ${chalk.dim("# Save results to file")}
  $ preship scan https://myapp.com --output results.json --format json
`
    )
    .action(async (url: string, options: ScanCommandOptions) => {
      await runScan(url, options);
    });
}

async function runScan(url: string, options: ScanCommandOptions): Promise<void> {
  const config = getConfig();
  const format = options.format || (config.get("format") as string) || "summary";
  const checks = (options.checks || "accessibility,security,performance")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const maxPages = parseInt(options.maxPages || "10", 10);
  const failUnder = options.failUnder
    ? parseInt(options.failUnder, 10)
    : (config.get("failUnder") as number) || 0;

  // Validate URL
  try {
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }
    new URL(url);
  } catch {
    console.error(chalk.red("\n  Error: Invalid URL provided."));
    console.error(chalk.dim(`  Received: ${url}`));
    console.error(chalk.dim("  Example:  https://myapp.com\n"));
    process.exit(1);
  }

  console.log("");
  console.log(
    chalk.bold("  PreShip") + chalk.dim(" - Scanning ") + chalk.underline(url)
  );
  console.log("");

  if (options.local) {
    await runLocalScan(url, checks, maxPages, format, failUnder, options);
  } else {
    await runRemoteScan(url, checks, maxPages, format, failUnder, options);
  }
}

async function runLocalScan(
  url: string,
  checks: string[],
  maxPages: number,
  format: string,
  failUnder: number,
  options: ScanCommandOptions
): Promise<void> {
  const spinner = ora({
    text: "Loading local scanner...",
    color: "cyan",
  }).start();

  try {
    // Dynamic import of the scanner package
    let scannerModule: any;
    try {
      scannerModule = await import("@preship/scanner");
    } catch {
      spinner.fail(
        "Could not load @preship/scanner. Install it with: npm install @preship/scanner"
      );
      process.exit(1);
    }

    spinner.text = `Scanning ${url} locally...`;

    const startTime = Date.now();
    const result = await scannerModule.scan(url, {
      maxPages,
      categories: checks,
      includeFixSuggestions: true,
    });
    const duration = Date.now() - startTime;

    spinner.succeed(chalk.green("Scan complete!"));

    const scanResult = {
      ...result,
      url,
      duration,
    };

    outputResults(scanResult, format, options.output);
    checkFailUnder(scanResult.overallScore as number ?? 0, failUnder);
  } catch (error) {
    spinner.fail(chalk.red("Local scan failed"));
    if (error instanceof Error) {
      console.error(chalk.red(`\n  ${error.message}\n`));
    }
    process.exit(1);
  }
}

async function runRemoteScan(
  url: string,
  checks: string[],
  maxPages: number,
  format: string,
  failUnder: number,
  options: ScanCommandOptions
): Promise<void> {
  const apiKey =
    options.apiKey ||
    process.env.PRESHIP_API_KEY ||
    (getConfig().get("apiKey") as string);

  if (!apiKey) {
    console.error(chalk.red("\n  Error: No API key provided."));
    console.error(
      chalk.dim("  Set one with: preship login")
    );
    console.error(
      chalk.dim("  Or pass it with: --api-key <key>")
    );
    console.error(
      chalk.dim("  Or set the PRESHIP_API_KEY environment variable")
    );
    console.error(
      chalk.dim("  Or use --local to run without an API key\n")
    );
    process.exit(1);
  }

  const spinner = ora({
    text: "Creating scan...",
    color: "cyan",
  }).start();

  try {
    // Create the scan
    const scan = await createScan(
      {
        url,
        options: {
          maxPages,
          categories: checks,
          includeFixSuggestions: true,
        },
      },
      apiKey
    );

    spinner.text = `Scan created (${chalk.dim(scan.id)}). Waiting for results...`;

    let dotCount = 0;
    const statusMessages = [
      "Crawling pages",
      "Running accessibility checks",
      "Analyzing security headers",
      "Measuring performance",
      "Generating fix suggestions",
    ];

    // Poll for results
    const result = await pollScanUntilComplete(scan.id, {
      apiKey,
      pollInterval: 2000,
      timeout: 300000,
      onPoll: (pollResult: { pagesScanned?: number }) => {
        dotCount = (dotCount + 1) % statusMessages.length;
        const statusMsg = statusMessages[Math.min(dotCount, statusMessages.length - 1)];
        const pagesInfo =
          pollResult.pagesScanned !== undefined
            ? ` (${pollResult.pagesScanned} pages scanned)`
            : "";
        spinner.text = `${statusMsg}${pagesInfo}...`;
      },
    });

    if (result.status === "failed") {
      spinner.fail(chalk.red("Scan failed"));
      console.error(chalk.red("\n  The scan could not be completed."));
      console.error(
        chalk.dim(`  Scan ID: ${scan.id}`)
      );
      console.error(
        chalk.dim("  Please try again or contact support.\n")
      );
      process.exit(1);
    }

    spinner.succeed(chalk.green("Scan complete!"));

    const scanResult: Record<string, unknown> = {
      url,
      overallScore: result.overallScore ?? 0,
      duration: 0,
      categories: result.categories,
      violations: result.violations,
      suggestions: result.suggestions,
      pagesScanned: result.pagesScanned,
      reportUrl: result.reportUrl,
    };

    // Calculate duration from timestamps if available
    if (result.createdAt && result.completedAt) {
      scanResult.duration =
        new Date(result.completedAt).getTime() -
        new Date(result.createdAt).getTime();
    }

    outputResults(scanResult, format, options.output);

    // Show report URL if available
    if (result.reportUrl) {
      console.log(
        chalk.dim(`  Full report: ${chalk.underline(result.reportUrl)}\n`)
      );
    }

    checkFailUnder(scanResult.overallScore as number, failUnder);
  } catch (error) {
    spinner.fail(chalk.red("Scan failed"));

    if (error instanceof ApiClientError) {
      if ((error as ApiClientError).statusCode === 401) {
        console.error(chalk.red("\n  Authentication failed. Check your API key."));
        console.error(chalk.dim("  Run: preship login\n"));
      } else if ((error as ApiClientError).statusCode === 429) {
        console.error(
          chalk.red("\n  Rate limit exceeded. Please try again later.")
        );
        console.error(
          chalk.dim("  Upgrade your plan for higher limits: https://preship.dev/pricing\n")
        );
      } else {
        console.error(chalk.red(`\n  API Error (${(error as ApiClientError).statusCode}): ${(error as ApiClientError).message}\n`));
      }
    } else if (error instanceof Error) {
      console.error(chalk.red(`\n  ${error.message}\n`));
    }

    process.exit(1);
  }
}

function outputResults(
  result: Record<string, unknown>,
  format: string,
  outputFile?: string
): void {
  let output: string;

  switch (format) {
    case "json":
      output = renderJson(result as any);
      break;
    case "table":
      output = renderTable(result as any);
      break;
    case "summary":
    default:
      output = renderFullReport(result as any);
      break;
  }

  console.log(output);

  if (outputFile) {
    const fileContent =
      format === "json" ? output : JSON.stringify(result, null, 2);
    fs.writeFileSync(outputFile, fileContent, "utf-8");
    console.log(chalk.dim(`  Results saved to ${outputFile}\n`));
  }
}

function checkFailUnder(score: number, threshold: number): void {
  if (threshold > 0 && score < threshold) {
    console.error(
      chalk.red(
        `\n  Score ${score} is below the threshold of ${threshold}. Exiting with failure.\n`
      )
    );
    process.exit(1);
  }
}
