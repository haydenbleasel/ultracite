import { existsSync } from "node:fs";

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
