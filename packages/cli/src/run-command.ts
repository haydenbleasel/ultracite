import process from "node:process";

import { sync as crossSpawnSync } from "cross-spawn";

type RunCommandOptions = NonNullable<Parameters<typeof crossSpawnSync>[2]>;
type RunCommandResult = ReturnType<typeof crossSpawnSync>;

export const runCommandSync = (
  command: string,
  args: string[],
  options: RunCommandOptions
): RunCommandResult =>
  crossSpawnSync(command, args, {
    ...options,
    shell: false,
  });

export const exitOnCommandFailure = (
  commandName: string,
  result: RunCommandResult
): void => {
  if (result.error) {
    throw new Error(`Failed to run ${commandName}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};
