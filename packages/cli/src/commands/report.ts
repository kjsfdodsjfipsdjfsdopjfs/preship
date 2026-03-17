import { Command } from "commander";
import chalk from "chalk";
import { getConfig, ApiClientError } from "../utils/api";
import { renderFullReport, renderJson, renderTable } from "../utils/display";
import fetch from "node-fetch";

export function registerReportCommand(program: Command): void {
  program
    .command("report <scanId>")
    .description("View a previous scan report")
    .option(
      "--format <format>",
      "Output format: summary, json, table",
      "summary"
    )
    .option("--api-key <key>", "API key (or use PRESHIP_API_KEY env var)")
    .action(async (scanId: string, options: { format?: string; apiKey?: string }) => {
      const config = getConfig();
      const apiKey =
        options.apiKey ||
        process.env.PRESHIP_API_KEY ||
        (config.get("apiKey") as string);

      if (!apiKey) {
        console.error(chalk.red("\n  Error: No API key provided."));
        console.error(
          chalk.dim("  Run: preship login <your-api-key>\n")
        );
        process.exit(1);
      }

      const baseUrl =
        (config.get("apiUrl") as string) || "https://api.preship.dev";

      try {
        const response = await fetch(`${baseUrl}/v1/scans/${scanId}`, {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
        });

        if (!response.ok) {
          throw new ApiClientError(
            `Failed to fetch report`,
            response.status
          );
        }

        const result = (await response.json()) as Record<string, unknown>;

        const format = options.format || "summary";
        switch (format) {
          case "json":
            console.log(renderJson(result as any));
            break;
          case "table":
            console.log(renderTable(result as any));
            break;
          default:
            console.log(renderFullReport(result as any));
            break;
        }
      } catch (error) {
        if (error instanceof ApiClientError) {
          if (error.statusCode === 404) {
            console.error(
              chalk.red(`\n  Scan not found: ${scanId}\n`)
            );
          } else {
            console.error(
              chalk.red(`\n  API Error (${error.statusCode}): ${error.message}\n`)
            );
          }
        } else if (error instanceof Error) {
          console.error(chalk.red(`\n  ${error.message}\n`));
        }
        process.exit(1);
      }
    });
}
