import { runAgentFix } from "../agent-fix";
import {
  buildUnresolvableBiomeConfigMessage,
  findUnresolvableBiomeConfig,
  UltraciteSetupError,
} from "../config-resolution";
import { normalizeFileArgs, toStylelintTargets } from "../linter-args";
import type { FixAgent } from "../linter-args";
import { exitOnCommandFailure, runSteps } from "../run-command";
import { spawnSync } from "../spawn-sync";
import { detectLinter } from "../utils";

const runBiomeFix = (files: string[], passthrough: string[]): void => {
  const unresolvableConfig = findUnresolvableBiomeConfig();

  if (unresolvableConfig) {
    throw new UltraciteSetupError(
      buildUnresolvableBiomeConfigMessage(unresolvableConfig)
    );
  }

  const args = ["check", "--write", "--no-errors-on-unmatched", ...passthrough];

  if (files.length > 0) {
    args.push(...files);
  } else {
    args.push("./");
  }

  const result = spawnSync("biome", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Biome", result);
};

const runEslintFix = (files: string[], passthrough: string[]): void => {
  const args = ["--fix", ...passthrough, ...(files.length > 0 ? files : ["."])];

  const result = spawnSync("eslint", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("ESLint", result);
};

const runPrettierFix = (files: string[], passthrough: string[]): void => {
  const args = [
    "--write",
    ...passthrough,
    ...(files.length > 0 ? files : ["."]),
  ];

  const result = spawnSync("prettier", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Prettier", result);
};

const runStylelintFix = (files: string[], passthrough: string[]): void => {
  const targets = toStylelintTargets(files);

  if (targets.length === 0) {
    return;
  }

  const args = ["--fix", ...passthrough, "--allow-empty-input", ...targets];

  const result = spawnSync("stylelint", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Stylelint", result);
};

const runOxlintFix = (files: string[], passthrough: string[]): void => {
  // Check if --unsafe is in passthrough, use --fix-dangerously instead
  const hasUnsafe = passthrough.includes("--unsafe");
  const filteredPassthrough = passthrough.filter((arg) => arg !== "--unsafe");

  const args = [
    hasUnsafe ? "--fix-dangerously" : "--fix",
    ...filteredPassthrough,
    ...(files.length > 0 ? files : ["."]),
  ];

  const result = spawnSync("oxlint", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Oxlint", result);
};

const runOxfmtFix = (files: string[], passthrough: string[]): void => {
  const args = [
    "--write",
    ...passthrough,
    ...(files.length > 0 ? files : ["."]),
  ];

  const result = spawnSync("oxfmt", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("oxfmt", result);
};

interface FixOptions {
  agent?: FixAgent | null;
}

// The plain path stays synchronous (and throws synchronously); only agent
// mode returns a promise. The command action awaits either shape.
export const fix = (
  files: string[],
  passthrough: string[] = [],
  { agent }: FixOptions = {}
): Promise<void> | void => {
  const linter = detectLinter();
  const normalizedFiles = normalizeFileArgs(files);

  if (!linter) {
    throw new Error(
      "No linter configuration found. Run `ultracite init` to set up a linter."
    );
  }

  if (agent) {
    return runAgentFix({
      agent,
      files: normalizedFiles,
      linter,
      passthrough,
    });
  }

  switch (linter) {
    case "eslint": {
      runSteps([
        () => runPrettierFix(normalizedFiles, []),
        () => runEslintFix(normalizedFiles, passthrough),
        () => runStylelintFix(normalizedFiles, []),
      ]);
      break;
    }
    case "oxlint": {
      runSteps([
        () => runOxfmtFix(normalizedFiles, []),
        () => runOxlintFix(normalizedFiles, passthrough),
      ]);
      break;
    }
    default: {
      runBiomeFix(normalizedFiles, passthrough);
    }
  }
};
