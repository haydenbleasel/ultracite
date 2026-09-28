import {
  buildUnresolvableBiomeConfigMessage,
  findUnresolvableBiomeConfig,
  UltraciteSetupError,
} from "../config-resolution";
import { normalizeFileArgs, toStylelintTargets } from "../linter-args";
import { findPathConfigFiles, resolvePathConfig } from "../path-config";
import { materializePathConfig } from "../path-config-adapters";
import { exitOnCommandFailure, runSteps } from "../run-command";
import { spawnSync } from "../spawn-sync";
import { detectLinter } from "../utils";

const runBiomeCheck = (
  files: string[],
  passthrough: string[],
  configPath?: string
): void => {
  const unresolvableConfig = findUnresolvableBiomeConfig();

  if (unresolvableConfig) {
    throw new UltraciteSetupError(
      buildUnresolvableBiomeConfigMessage(unresolvableConfig)
    );
  }

  const args = ["check", "--no-errors-on-unmatched", ...passthrough];
  if (configPath) {
    args.push(`--config-path=${configPath}`);
  }

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

const runEslintCheck = (
  files: string[],
  passthrough: string[],
  configPath?: string
): void => {
  const args = [...passthrough];
  if (configPath) {
    args.push("--config", configPath);
  }
  args.push(...(files.length > 0 ? files : ["."]));

  const result = spawnSync("eslint", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("ESLint", result);
};

const runPrettierCheck = (files: string[], passthrough: string[]): void => {
  const args = [
    "--check",
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
  exitOnCommandFailure("Stylelint", result);
};

const runOxlintCheck = (
  files: string[],
  passthrough: string[],
  configPath?: string
): void => {
  const args = [...passthrough];
  if (configPath) {
    args.push("--config", configPath);
  }
  args.push(...(files.length > 0 ? files : ["."]));

  const result = spawnSync("oxlint", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Oxlint", result);
};

const runOxfmtCheck = (files: string[], passthrough: string[]): void => {
  const args = [
    "--check",
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
): void | Promise<void> => {
  const linter = detectLinter();
  const normalizedFiles = normalizeFileArgs(files);
  const configFiles = findPathConfigFiles(process.cwd());

  if (!linter) {
    throw new Error(
      "No linter configuration found. Run `ultracite init` to set up a linter."
    );
  }

  if (configFiles.length > 0) {
    return resolvePathConfig(process.cwd(), configFiles).then(
      async (resolved) => {
        if (!resolved) {
          return;
        }
        const configPath = await materializePathConfig(linter, resolved);
        switch (linter) {
          case "eslint": {
            runSteps([
              () => runPrettierCheck(normalizedFiles, []),
              () => runEslintCheck(normalizedFiles, passthrough, configPath),
              () => runStylelintCheck(normalizedFiles, []),
            ]);
            break;
          }
          case "oxlint": {
            runSteps([
              () => runOxfmtCheck(normalizedFiles, []),
              () => runOxlintCheck(normalizedFiles, passthrough, configPath),
            ]);
            break;
          }
          default: {
            runBiomeCheck(normalizedFiles, passthrough, configPath);
          }
        }
      }
    );
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
