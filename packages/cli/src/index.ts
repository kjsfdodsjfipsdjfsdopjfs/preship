#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { registerScanCommand } from "./commands/scan";
import { registerLoginCommand } from "./commands/login";
import { registerConfigCommand } from "./commands/config";
import { registerReportCommand } from "./commands/report";

const program = new Command();

program
  .name("preship")
  .description(
    chalk.bold("PreShip") +
      " - Scan your web apps for accessibility, security, and performance issues"
  )
  .version("0.1.0", "-v, --version", "Display the current version")
  .addHelpText(
    "after",
    `
${chalk.bold("Examples:")}
  ${chalk.dim("# Scan a URL for all issues")}
  $ preship scan https://myapp.com

  ${chalk.dim("# Scan with specific checks")}
  $ preship scan https://myapp.com --checks accessibility,security

  ${chalk.dim("# Fail CI if score drops below 80")}
  $ preship scan https://myapp.com --fail-under 80

  ${chalk.dim("# Run a local scan (no API key needed)")}
  $ preship scan https://myapp.com --local

  ${chalk.dim("# View a previous scan report")}
  $ preship report abc-123

  ${chalk.dim("# Log in with your API key")}
  $ preship login
`
  );

registerScanCommand(program);
registerLoginCommand(program);
registerConfigCommand(program);
registerReportCommand(program);

program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
