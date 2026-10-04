import { log } from "@clack/prompts";

import { runAgentFix } from "../agent-fix";
import {
  buildUnresolvableBiomeConfigMessage,
  findUnresolvableBiomeConfig,
  UltraciteSetupError,
} from "../config-resolution";
import {
  normalizeFileArgs,
  toOxlintTargets,
  toStylelintTargets,
} from "../linter-args";
import type { FixAgent } from "../linter-args";
import { isCommandAvailable } from "../resolve-command";
import {
  exitOnCommandFailure,
  NO_LINTER_CONFIG_MESSAGE,
  runSteps,
  STYLELINT_MISSING_MESSAGE,
} from "../run-command";
import { spawnSync } from "../spawn-sync";
import { detectLinter } from "../utils";

const UNSAFE_FLAG = "--unsafe";

// ESLint has no unsafe tier of fixes and rejects an unknown --unsafe flag, so
// it's dropped rather than failing the whole run.
const dropUnsupportedUnsafe = (passthrough: string[]): string[] => {
  if (!passthrough.includes(UNSAFE_FLAG)) {
    return passthrough;
  }

  log.warn(
    "ESLint has no unsafe fixes, so --unsafe was ignored. It applies Biome's unsafe fixes and Oxlint's dangerous fixes."
  );
  return passthrough.filter((arg) => arg !== UNSAFE_FLAG);
};

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
  // An explicit file Prettier has no parser for (a Dockerfile, .env) is an
  // error without this; with it, Prettier skips the file as it does when
  // expanding a directory.
  const args = [
    "--write",
    "--ignore-unknown",
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

  if (result.errorCode === "ENOENT") {
    log.warn(STYLELINT_MISSING_MESSAGE);
    return;
  }

  // On Windows a missing executable surfaces as a generic non-zero exit
  // rather than ENOENT. Only skip when the binary cannot be resolved, so a
  // real Stylelint failure still fails.
  if (
    result.error === undefined &&
    result.status !== null &&
    result.status !== 0 &&
    !isCommandAvailable("stylelint")
  ) {
    log.warn(STYLELINT_MISSING_MESSAGE);
    return;
  }

  exitOnCommandFailure("Stylelint", result);
};

const runOxlintFix = (files: string[], passthrough: string[]): void => {
  const targets = toOxlintTargets(files);

  if (targets.length === 0) {
    return;
  }

  // Check if --unsafe is in passthrough, use --fix-dangerously instead
  const hasUnsafe = passthrough.includes(UNSAFE_FLAG);
  const filteredPassthrough = passthrough.filter((arg) => arg !== UNSAFE_FLAG);

  const args = [
    hasUnsafe ? "--fix-dangerously" : "--fix",
    ...filteredPassthrough,
    ...targets,
  ];

  const result = spawnSync("oxlint", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Oxlint", result);
};

const runOxfmtFix = (files: string[], passthrough: string[]): void => {
  // An explicit file oxfmt does not format (a Dockerfile, .env) is an error
  // without this; with it, oxfmt reports zero files and exits 0.
  const args = [
    "--write",
    "--no-error-on-unmatched-pattern",
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
  linterArgs: string[] = [],
  { agent }: FixOptions = {}
): Promise<void> | void => {
  const linter = detectLinter();
  const normalizedFiles = normalizeFileArgs(files);

  if (!linter) {
    throw new UltraciteSetupError(NO_LINTER_CONFIG_MESSAGE);
  }

  const passthrough =
    linter === "eslint" ? dropUnsupportedUnsafe(linterArgs) : linterArgs;

  if (agent) {
    return runAgentFix({
      agent,
      files: normalizedFiles,
      linter,
      passthrough,
    });
  }

  switch (linter) {
    // Lint fixes first, then the formatter: a fixer can insert unformatted
    // code (curly braces, split imports, requoted font names), and only a
    // later format pass leaves the file in the formatter's shape. The agent
    // adapters in agent-fix/linters.ts follow the same order.
    case "eslint": {
      runSteps([
        () => runEslintFix(normalizedFiles, passthrough),
        () => runStylelintFix(normalizedFiles, []),
        () => runPrettierFix(normalizedFiles, []),
      ]);
      break;
    }
    case "oxlint": {
      runSteps([
        () => runOxlintFix(normalizedFiles, passthrough),
        () => runOxfmtFix(normalizedFiles, []),
      ]);
      break;
    }
    default: {
      runBiomeFix(normalizedFiles, passthrough);
    }
  }
};
