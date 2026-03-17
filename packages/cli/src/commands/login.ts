import { Command } from "commander";
import chalk from "chalk";
import { getConfig } from "../utils/api";

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description("Save your PreShip API key for future use")
    .argument("[key]", "Your API key (or set PRESHIP_API_KEY env var)")
    .action(async (key?: string) => {
      const apiKey = key || process.env.PRESHIP_API_KEY;

      if (!apiKey) {
        console.error(chalk.red("\n  Error: No API key provided."));
        console.error(
          chalk.dim("  Usage: preship login <your-api-key>")
        );
        console.error(
          chalk.dim("  Get an API key at: https://preship.dev/settings/api-keys\n")
        );
        process.exit(1);
      }

      const config = getConfig();
      config.set("apiKey", apiKey);

      console.log(chalk.green("\n  API key saved successfully!"));
      console.log(
        chalk.dim(`  Key prefix: ${apiKey.substring(0, 10)}...`)
      );
      console.log(
        chalk.dim("  You can now run scans without passing --api-key\n")
      );
    });
}
