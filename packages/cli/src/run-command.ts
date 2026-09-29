import { UltraciteSetupError } from "./config-resolution";
import type { SpawnSyncResult } from "./spawn-sync";

export const NO_LINTER_CONFIG_MESSAGE =
  "No linter configuration found. Run `ultracite init` to set up a linter.";

// Stylelint is optional in the ESLint toolchain (doctor only warns when it's
// missing), so a project without it skips CSS linting instead of failing.
export const STYLELINT_MISSING_MESSAGE =
  "Stylelint isn't installed, so CSS files were not linted. Install it to lint them.";

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
  if (result.errorCode === "ENOENT") {
    throw new UltraciteSetupError(
      `${commandName} isn't installed in this project. Install it (\`ultracite doctor\` checks the setup) and try again.`
    );
  }

  if (result.error) {
    throw new UltraciteSetupError(
      `Failed to run ${commandName}: ${result.error.message}`
    );
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

/**
 * Run every step, even after one fails, so a missing or failing tool doesn't
 * hide what the others report; then rethrow the first failure.
 */
export const runSteps = (steps: (() => void)[]): void => {
  const failures: Error[] = [];

  for (const step of steps) {
    try {
      step();
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  const [firstFailure] = failures;

  if (firstFailure instanceof LinterExitError) {
    throw new LinterExitError(firstFailure.commandName, firstFailure.exitCode);
  }

  if (firstFailure) {
    throw firstFailure;
  }
};
