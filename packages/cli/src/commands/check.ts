import { exitOnCommandFailure, runCommandSync } from "../run-command";
import { detectLinter } from "../utils";

const runBiomeCheck = (files: string[], passthrough: string[]): void => {
  const args = ["check", "--no-errors-on-unmatched", ...passthrough];

  if (files.length > 0) {
    args.push(...files);
  } else {
    args.push("./");
  }

  const result = runCommandSync("biome", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Biome", result);
};

const runEslintCheck = (files: string[], passthrough: string[]): void => {
  const args = [...passthrough, ...(files.length > 0 ? files : ["."])];

  const result = runCommandSync("eslint", args, {
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

  const result = runCommandSync("prettier", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Prettier", result);
};

const runStylelintCheck = (files: string[], passthrough: string[]): void => {
  const args = [...passthrough, ...(files.length > 0 ? files : ["."])];

  const result = runCommandSync("stylelint", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Stylelint", result);
};

const runOxlintCheck = (files: string[], passthrough: string[]): void => {
  const args = [...passthrough, ...(files.length > 0 ? files : ["."])];

  const result = runCommandSync("oxlint", args, {
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

  const result = runCommandSync("oxfmt", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("oxfmt", result);
};

export const check = async (
  files: string[] = [],
  passthrough: string[] = []
): Promise<void> => {
  const linter = await detectLinter();

  if (!linter) {
    throw new Error(
      "No linter configuration found. Run `ultracite init` to set up a linter."
    );
  }

  switch (linter) {
    case "eslint": {
      await runPrettierCheck(files, []);
      await runEslintCheck(files, passthrough);
      await runStylelintCheck(files, []);
      break;
    }
    case "oxlint": {
      await runOxfmtCheck(files, []);
      await runOxlintCheck(files, passthrough);
      break;
    }
    default: {
      await runBiomeCheck(files, passthrough);
    }
  }
};
