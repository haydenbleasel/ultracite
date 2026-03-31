import { Command } from "commander";

import packageJson from "../package.json" with { type: "json" };
import { check } from "./commands/check";
import { doctor } from "./commands/doctor";
import { fix } from "./commands/fix";
import { initialize } from "./initialize";

const program = new Command();

program
  .name("ultracite")
  .version(packageJson.version)
  .description(packageJson.description);

program
  .command("init")
  .description("Initialize Ultracite in the current directory")
  .option("--pm <pm>", "Package manager to use")
  .option("--linter <linter>", "Linter to use")
  .option("--editors <editors...>", "Editors to configure")
  .option(
    "--agents <agents...>",
    "Agents to enable (use universal for AGENTS.md)"
  )
  .option("--hooks <hooks...>", "Hooks to enable")
  .option("--frameworks <frameworks...>", "Frameworks being used")
  .option("--integrations <integrations...>", "Integrations to enable")
  .option("--install-skill", "Install the reusable Ultracite skill after setup")
  .option(
    "--type-aware",
    "Enable type-aware linting (enables project/scanner rules)"
  )
  .option("--skip-install", "Skip installing dependencies")
  .option("--quiet", "Suppress interactive prompts")
  .action(async (opts) => {
    await initialize({
      agents: opts.agents,
      editors: opts.editors,
      frameworks: opts.frameworks,
      hooks: opts.hooks,
      installSkill: opts.installSkill,
      integrations: opts.integrations,
      linter: opts.linter,
      pm: opts.pm,
      quiet:
        opts.quiet ?? (process.env.CI === "true" || process.env.CI === "1"),
      skipInstall: opts.skipInstall,
      "type-aware": opts.typeAware,
    });
  });

program
  .command("check")
  .argument("[files...]", "Files to check")
  .description(
    "Run linter without fixing files. Unknown options are passed to the underlying linter."
  )
  .allowUnknownOption()
  .action(async (files) => {
    const cmdIndex = process.argv.indexOf("check");
    const allArgs = process.argv.slice(cmdIndex + 1);
    const passthrough = allArgs.filter((arg) => arg.startsWith("-"));
    // Filter out any flags that Commander may have included in files
    const filteredFiles = files.filter(
      (file: string) => !file.startsWith("--")
    );
    await check(filteredFiles, passthrough);
  });

program
  .command("fix")
  .argument("[files...]", "Files to fix")
  .description(
    "Run linter and fix files. Unknown options are passed to the underlying linter."
  )
  .allowUnknownOption()
  .action(async (files) => {
    const cmdIndex = process.argv.indexOf("fix");
    const allArgs = process.argv.slice(cmdIndex + 1);
    const passthrough = allArgs.filter((arg) => arg.startsWith("-"));
    // Filter out any flags that Commander may have included in files
    const filteredFiles = files.filter(
      (file: string) => !file.startsWith("--")
    );
    await fix(filteredFiles, passthrough);
  });

program
  .command("doctor")
  .description("Verify your Ultracite setup")
  .action(async () => {
    await doctor();
  });

if (!process.env.TEST) {
  program.parse();
}

export { program };
