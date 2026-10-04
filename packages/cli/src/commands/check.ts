import { log } from "@clack/prompts";

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
import { isCommandAvailable } from "../resolve-command";
import {
  exitOnCommandFailure,
  NO_LINTER_CONFIG_MESSAGE,
  runSteps,
  STYLELINT_MISSING_MESSAGE,
} from "../run-command";
import { spawnSync } from "../spawn-sync";
import { detectLinter } from "../utils";

const runBiomeCheck = (files: string[], passthrough: string[]): void => {
  const unresolvableConfig = findUnresolvableBiomeConfig();

  if (unresolvableConfig) {
    throw new UltraciteSetupError(
      buildUnresolvableBiomeConfigMessage(unresolvableConfig)
    );
  }

  const args = ["check", "--no-errors-on-unmatched", ...passthrough];

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

const runEslintCheck = (files: string[], passthrough: string[]): void => {
  const args = [...passthrough, ...(files.length > 0 ? files : ["."])];

  const result = spawnSync("eslint", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("ESLint", result);
};

const runPrettierCheck = (files: string[], passthrough: string[]): void => {
  // An explicit file Prettier has no parser for (a Dockerfile, .env) is an
  // error without --ignore-unknown, as it is for `fix`.
  const args = [
    "--check",
    "--ignore-unknown",
    ...passthrough,
    ...(files.length > 0 ? files : ["."]),
  ];

  const result = spawnSync("prettier", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Prettier", result);
};

const runStylelintCheck = (files: string[], passthrough: string[]): void => {
  const targets = toStylelintTargets(files);

  if (targets.length === 0) {
    return;
  }

  const args = [...passthrough, "--allow-empty-input", ...targets];

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

const runOxlintCheck = (files: string[], passthrough: string[]): void => {
  // Oxlint exits 1 on an explicit file it doesn't lint (a README, a
  // Dockerfile), so those are dropped as they are for `fix`.
  const targets = toOxlintTargets(files);

  if (targets.length === 0) {
    return;
  }

  const args = [...passthrough, ...targets];

  const result = spawnSync("oxlint", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Oxlint", result);
};

const runOxfmtCheck = (files: string[], passthrough: string[]): void => {
  // An explicit file oxfmt does not format is an error without
  // --no-error-on-unmatched-pattern, as it is for `fix`.
  const args = [
    "--check",
    "--no-error-on-unmatched-pattern",
    ...passthrough,
    ...(files.length > 0 ? files : ["."]),
  ];

  const result = spawnSync("oxfmt", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("oxfmt", result);
};

export const check = (
  files: string[] = [],
  passthrough: string[] = []
): void => {
  const linter = detectLinter();
  const normalizedFiles = normalizeFileArgs(files);

  if (!linter) {
    throw new UltraciteSetupError(NO_LINTER_CONFIG_MESSAGE);
  }

  switch (linter) {
    case "eslint": {
      runSteps([
        () => runPrettierCheck(normalizedFiles, []),
        () => runEslintCheck(normalizedFiles, passthrough),
        () => runStylelintCheck(normalizedFiles, []),
      ]);
      break;
    }
    case "oxlint": {
      runSteps([
        () => runOxfmtCheck(normalizedFiles, []),
        () => runOxlintCheck(normalizedFiles, passthrough),
      ]);
      break;
    }
    default: {
      runBiomeCheck(normalizedFiles, passthrough);
    }
  }
};
