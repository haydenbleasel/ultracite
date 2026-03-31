import { exitOnCommandFailure, runCommandSync } from "../run-command";
import { detectLinter } from "../utils";

const runBiomeFix = (files: string[], passthrough: string[]): void => {
  const args = ["check", "--write", "--no-errors-on-unmatched", ...passthrough];

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

const runEslintFix = (files: string[], passthrough: string[]): void => {
  const args = ["--fix", ...passthrough, ...(files.length > 0 ? files : ["."])];

  const result = runCommandSync("eslint", args, {
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

  const result = runCommandSync("prettier", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("Prettier", result);
};

const runStylelintFix = (files: string[], passthrough: string[]): void => {
  const args = ["--fix", ...passthrough, ...(files.length > 0 ? files : ["."])];

  const result = runCommandSync("stylelint", args, {
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

  const result = runCommandSync("oxlint", args, {
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

  const result = runCommandSync("oxfmt", args, {
    stdio: "inherit",
  });
  exitOnCommandFailure("oxfmt", result);
};

export const fix = async (
  files: string[],
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
      await runPrettierFix(files, []);
      await runEslintFix(files, passthrough);
      await runStylelintFix(files, []);
      break;
    }
    case "oxlint": {
      await runOxfmtFix(files, []);
      await runOxlintFix(files, passthrough);
      break;
    }
    default: {
      await runBiomeFix(files, passthrough);
    }
  }
};
