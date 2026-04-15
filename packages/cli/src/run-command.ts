import { sync as crossSpawnSync } from "cross-spawn";

type RunCommandOptions = NonNullable<Parameters<typeof crossSpawnSync>[2]>;
type RunCommandResult = ReturnType<typeof crossSpawnSync>;

export class LinterExitError extends Error {
  readonly exitCode: number;

  override readonly name = "LinterExitError";

  constructor(commandName: string, exitCode: number) {
    super(`${commandName} exited with code ${exitCode}`);
    this.exitCode = exitCode;
  }
}

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

  if (result.status === null) {
    throw new Error(
      `${commandName} was killed by signal ${result.signal ?? "unknown"}`
    );
  }

  if (result.status !== 0) {
    throw new LinterExitError(commandName, result.status);
  }
};
