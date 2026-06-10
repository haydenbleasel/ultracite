import { existsSync } from "node:fs";
import path from "node:path";

type PathExists = (path: string) => boolean;

interface SplitLinterArgsOptions {
  commandName: "check" | "fix";
  parsedArgs: string[];
  pathExists?: PathExists;
  rawArgs?: string[];
}

const getCommandArgs = (
  commandName: SplitLinterArgsOptions["commandName"],
  parsedArgs: string[],
  rawArgs?: string[]
): string[] => {
  const commandIndex = rawArgs?.indexOf(commandName) ?? -1;

  if (!rawArgs || commandIndex === -1) {
    return parsedArgs;
  }

  return rawArgs.slice(commandIndex + 1);
};

export const normalizeFileArgs = (files: string[]): string[] =>
  files.map((file) => (file.startsWith("-") ? `./${file}` : file));

const STYLE_FILE_GLOB = "**/*.{css,scss,sass,less}";

const styleExtensions = [".css", ".scss", ".sass", ".less"];

const hasStyleExtension = (file: string): boolean => {
  const lowered = file.toLowerCase();
  return styleExtensions.some((extension) => lowered.endsWith(extension));
};

/**
 * Stylelint has no extension filtering of its own, so handing it the same
 * targets as ESLint/Prettier makes it parse .ts/.json files as CSS and fail.
 * Style files pass through, extension-less targets (directories) become
 * style-scoped globs, and other files are dropped. An empty result means
 * Stylelint has nothing to lint and should be skipped.
 */
export const toStylelintTargets = (files: string[]): string[] => {
  if (files.length === 0) {
    return [STYLE_FILE_GLOB];
  }

  const targets: string[] = [];

  for (const file of files) {
    if (hasStyleExtension(file)) {
      targets.push(file);
      continue;
    }

    if (path.extname(file) === "") {
      const base = file.replace(/\/+$/u, "");
      targets.push(
        base === "." || base === ""
          ? STYLE_FILE_GLOB
          : `${base}/${STYLE_FILE_GLOB}`
      );
    }
  }

  return targets;
};

export const splitLinterArgs = ({
  commandName,
  parsedArgs,
  pathExists = existsSync,
  rawArgs,
}: SplitLinterArgsOptions): {
  files: string[];
  passthrough: string[];
} => {
  const args = getCommandArgs(commandName, parsedArgs, rawArgs);
  const separatorIndex = args.indexOf("--");

  if (separatorIndex !== -1) {
    return {
      files: args.slice(separatorIndex + 1),
      passthrough: args.slice(0, separatorIndex),
    };
  }

  const files: string[] = [];
  const passthrough: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-") && !pathExists(arg)) {
      passthrough.push(arg);
      continue;
    }

    files.push(arg);
  }

  return { files, passthrough };
};
