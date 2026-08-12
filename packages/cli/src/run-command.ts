import type { SpawnSyncResult } from "./spawn-sync";

export class LinterExitError extends Error {
  readonly commandName: string;

  readonly exitCode: number;

  override readonly name = "LinterExitError";

  constructor(commandName: string, exitCode: number) {
    super(`${commandName} exited with code ${exitCode}`);
    this.commandName = commandName;
    this.exitCode = exitCode;
  }
}

export const exitOnCommandFailure = (
  commandName: string,
  result: SpawnSyncResult
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

export const runSteps = (steps: (() => void)[]): void => {
  let firstFailure: LinterExitError | null = null;

  for (const step of steps) {
    try {
      step();
    } catch (error) {
      if (error instanceof LinterExitError) {
        firstFailure ??= error;
        continue;
      }
      throw error;
    }
  }

  if (firstFailure) {
    throw new LinterExitError(firstFailure.commandName, firstFailure.exitCode);
  }
};
