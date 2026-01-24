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
  .option("--agents <agents...>", "Agents to enable")
  .option("--hooks <hooks...>", "Hooks to enable")
  .option("--frameworks <frameworks...>", "Frameworks being used")
  .option("--integrations <integrations...>", "Integrations to enable")
  .option("--migrate <tools...>", "Migration tools to remove")
  .option("--type-aware", "Enable type-aware linting (oxlint only)")
  .option("--skip-install", "Skip installing dependencies")
  .option("--quiet", "Suppress interactive prompts")
  .action(async (opts) => {
    await initialize({
      pm: opts.pm,
      linter: opts.linter,
      editors: opts.editors,
      agents: opts.agents,
      hooks: opts.hooks,
      frameworks: opts.frameworks,
      integrations: opts.integrations,
      migrate: opts.migrate,
      "type-aware": opts.typeAware,
      skipInstall: opts.skipInstall,
      quiet: opts.quiet ?? (process.env.CI === "true" || process.env.CI === "1"),
    });
  });

program
  .command("check")
  .argument("[files...]", "Files to check")
  .description("Run linter without fixing files")
  .option(
    "--diagnostic-level <level>",
    "Level of diagnostics (info, warn, error)"
  )
  .option("--linter <linter>", "Linter to use")
  .option("--type-aware", "Enable type-aware linting (oxlint only)")
  .option("--type-check", "Enable TypeScript diagnostics (oxlint only)")
  .option(
    "--no-error-on-unmatched-pattern",
    "Suppress unmatched pattern errors"
  )
  .option("--error-on-warnings", "Treat warnings as errors (biome only)")
  .action(async (files, opts) => {
    await check(files, {
      "diagnostic-level": opts.diagnosticLevel,
      linter: opts.linter,
      "type-aware": opts.typeAware,
      "type-check": opts.typeCheck,
      "no-error-on-unmatched-pattern": opts.errorOnUnmatchedPattern === false,
      "error-on-warnings": opts.errorOnWarnings,
    });
  });

program
  .command("fix")
  .argument("[files...]", "Files to fix")
  .description("Run linter and fix files")
  .option("--unsafe", "Apply unsafe fixes")
  .option("--linter <linter>", "Linter to use")
  .option("--type-aware", "Enable type-aware linting (oxlint only)")
  .option("--type-check", "Enable TypeScript diagnostics (oxlint only)")
  .option("--error-on-warnings", "Treat warnings as errors (biome only)")
  .action(async (files, opts) => {
    await fix(files, {
      unsafe: opts.unsafe,
      linter: opts.linter,
      "type-aware": opts.typeAware,
      "type-check": opts.typeCheck,
      "error-on-warnings": opts.errorOnWarnings,
    });
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
