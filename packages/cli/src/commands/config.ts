import { Command } from "commander";
import chalk from "chalk";
import { getConfig } from "../utils/api";

export function registerConfigCommand(program: Command): void {
  program
    .command("config")
    .description("View or update CLI configuration")
    .option("--set <key=value>", "Set a configuration value")
    .option("--get <key>", "Get a configuration value")
    .option("--list", "List all configuration values")
    .option("--reset", "Reset all configuration to defaults")
    .action(
      async (options: {
        set?: string;
        get?: string;
        list?: boolean;
        reset?: boolean;
      }) => {
        const config = getConfig();

        if (options.reset) {
          config.clear();
          console.log(chalk.green("\n  Configuration reset to defaults.\n"));
          return;
        }

        if (options.set) {
          const [key, ...rest] = options.set.split("=");
          const value = rest.join("=");
          if (!key || value === undefined) {
            console.error(
              chalk.red("\n  Error: Use --set key=value format.\n")
            );
            process.exit(1);
          }
          config.set(key, value);
          console.log(
            chalk.green(`\n  Set ${key} = ${value}\n`)
          );
          return;
        }

        if (options.get) {
          const value = config.get(options.get);
          console.log(`\n  ${options.get} = ${value ?? "(not set)"}\n`);
          return;
        }

        // Default: list all config
        console.log(chalk.bold("\n  PreShip CLI Configuration\n"));
        const store = config.store as unknown as Record<string, unknown>;
        for (const [key, value] of Object.entries(store)) {
          const displayValue =
            key === "apiKey" && typeof value === "string" && value.length > 10
              ? value.substring(0, 10) + "..."
              : String(value);
          console.log(`  ${chalk.dim(key)}: ${displayValue}`);
        }
        console.log("");
      }
    );
}
