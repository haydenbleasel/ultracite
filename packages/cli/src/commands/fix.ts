import process from "node:process";

import { log } from "@clack/prompts";

import { runAgentFix } from "../agent-fix";
import {
  buildUnresolvableBiomeConfigMessage,
  findUnresolvableBiomeConfig,
  UltraciteSetupError,
} from "../config-resolution";
import type { HookReport } from "../hook-input";
import {
  eslintIgnoredFileArgs,
  normalizeFileArgs,
  toOxlintTargets,
  toStylelintTargets,
} from "../linter-args";
import type { FixAgent } from "../linter-args";
import {
  assertBunCanLint,
  bunFileSelectionArgs,
  spawnBun,
} from "../linters/bun";
import {
  exitOnCommandFailure,
  LinterExitError,
  NO_LINTER_CONFIG_MESSAGE,
  runSteps,
  STYLELINT_MISSING_MESSAGE,
} from "../run-command";
import { spawnSync } from "../spawn-sync";
import type {
  SpawnSyncOptions,
  SpawnSyncResult,
  StdoutToStderr,
} from "../spawn-sync";
import { detectLinter } from "../utils";

const UNSAFE_FLAG = "--unsafe";

// Claude Code, CodeBuddy, VS Code and Windsurf hand a post-edit hook's stderr
// to the agent when the hook exits with 2; any other non-zero code only shows
// the output to the user. A hook run that leaves problems behind exits with 2
// on those hosts so the agent sees them and fixes them next.
export const HOOK_FEEDBACK_EXIT_CODE = 2;

// Hosts that report back to the agent read what the tools print from stderr.
const STDOUT_TO_STDERR: StdoutToStderr = ["inherit", 2, "inherit"];

type FixStdio = NonNullable<SpawnSyncOptions["stdio"]>;

// Where a fix step's tools print: a stdio mode, plus, for a hook that hands
// the output to the agent in one piece, a list it's collected in.
interface FixIo {
  collected?: string[];
  stdio: FixStdio;
}

const collectOutput = (result: SpawnSyncResult, io: FixIo) => {
  io.collected?.push(
    ...[result.stdout, result.stderr].filter(
      (text): text is string => text !== undefined && text.trim() !== ""
    )
  );

  return result;
};

const runTool = (command: string, args: string[], io: FixIo) =>
  collectOutput(spawnSync(command, args, { stdio: io.stdio }), io);

const runBunTool = (tool: "fmt" | "lint", args: string[], io: FixIo) =>
  collectOutput(spawnBun(tool, args, { stdio: io.stdio }), io);

// ESLint has no unsafe tier of fixes and rejects an unknown --unsafe flag, so
// it's dropped rather than failing the whole run.
const dropUnsupportedUnsafe = (passthrough: string[]): string[] => {
  if (!passthrough.includes(UNSAFE_FLAG)) {
    return passthrough;
  }

  log.warn(
    "ESLint has no unsafe fixes, so --unsafe was ignored. It applies Biome's unsafe fixes and Oxlint's dangerous fixes."
  );

  return passthrough.filter((arg) => arg !== UNSAFE_FLAG);
};

const runBiomeFix = (
  files: string[],
  passthrough: string[],
  io: FixIo
): void => {
  const unresolvableConfig = findUnresolvableBiomeConfig();

  if (unresolvableConfig) {
    throw new UltraciteSetupError(
      buildUnresolvableBiomeConfigMessage(unresolvableConfig)
    );
  }

  const args = ["check", "--write", "--no-errors-on-unmatched", ...passthrough];

  if (files.length > 0) {
    args.push(...files);
  } else {
    args.push("./");
  }

  const result = runTool("biome", args, io);
  exitOnCommandFailure("Biome", result);
};

const runEslintFix = (
  files: string[],
  passthrough: string[],
  io: FixIo
): void => {
  const args = [
    "--fix",
    ...eslintIgnoredFileArgs(files, passthrough),
    ...passthrough,
    ...(files.length > 0 ? files : ["."]),
  ];

  const result = runTool("eslint", args, io);
  exitOnCommandFailure("ESLint", result);
};

const runPrettierFix = (
  files: string[],
  passthrough: string[],
  io: FixIo
): void => {
  // An explicit file Prettier has no parser for (a Dockerfile, .env) is an
  // error without this; with it, Prettier skips the file as it does when
  // expanding a directory.
  const args = [
    "--write",
    "--ignore-unknown",
    ...passthrough,
    ...(files.length > 0 ? files : ["."]),
  ];

  const result = runTool("prettier", args, io);
  exitOnCommandFailure("Prettier", result);
};

const runStylelintFix = (
  files: string[],
  passthrough: string[],
  io: FixIo
): void => {
  const targets = toStylelintTargets(files);

  if (targets.length === 0) {
    return;
  }

  const args = ["--fix", ...passthrough, "--allow-empty-input", ...targets];

  const result = runTool("stylelint", args, io);

  if (result.errorCode === "ENOENT") {
    log.warn(STYLELINT_MISSING_MESSAGE);

    return;
  }

  exitOnCommandFailure("Stylelint", result);
};

const runOxlintFix = (
  files: string[],
  passthrough: string[],
  io: FixIo
): void => {
  const targets = toOxlintTargets(files);

  if (targets.length === 0) {
    return;
  }

  // Check if --unsafe is in passthrough, use --fix-dangerously instead
  const hasUnsafe = passthrough.includes(UNSAFE_FLAG);
  const filteredPassthrough = passthrough.filter((arg) => arg !== UNSAFE_FLAG);

  const args = [
    hasUnsafe ? "--fix-dangerously" : "--fix",
    ...filteredPassthrough,
    ...targets,
  ];

  const result = runTool("oxlint", args, io);
  exitOnCommandFailure("Oxlint", result);
};

const runOxfmtFix = (
  files: string[],
  passthrough: string[],
  io: FixIo
): void => {
  // An explicit file oxfmt does not format (a Dockerfile, .env) is an error
  // without this; with it, oxfmt reports zero files and exits 0.
  const args = [
    "--write",
    "--no-error-on-unmatched-pattern",
    ...passthrough,
    ...(files.length > 0 ? files : ["."]),
  ];

  const result = runTool("oxfmt", args, io);
  exitOnCommandFailure("oxfmt", result);
};

// Bun reads the Oxlint and oxfmt configs and takes their flags, so its
// steps are Oxlint's and oxfmt's with `bun lint` and `bun fmt` swapped in.
const runBunLintFix = (
  files: string[],
  passthrough: string[],
  io: FixIo
): void => {
  const targets = toOxlintTargets(files);

  if (targets.length === 0) {
    return;
  }

  const hasUnsafe = passthrough.includes(UNSAFE_FLAG);
  const filteredPassthrough = passthrough.filter((arg) => arg !== UNSAFE_FLAG);

  const args = [
    hasUnsafe ? "--fix-dangerously" : "--fix",
    ...filteredPassthrough,
    ...targets,
  ];

  exitOnCommandFailure("bun lint", runBunTool("lint", args, io));
};

const runBunFmtFix = (
  files: string[],
  passthrough: string[],
  io: FixIo
): void => {
  const args = [
    "--write",
    "--no-error-on-unmatched-pattern",
    ...passthrough,
    ...(files.length > 0 ? files : ["."]),
  ];

  exitOnCommandFailure("bun fmt", runBunTool("fmt", args, io));
};

interface FixOptions {
  agent?: FixAgent | null;
  /** Running from an agent's post-edit hook (`--hook`). */
  hook?: boolean;
  /**
   * Running from a post-edit hook, how the problems left after fixing reach
   * the agent (see HookReport): `"stderr"` sends everything the tools print
   * to stderr and exits with HOOK_FEEDBACK_EXIT_CODE; `"context"` prints it
   * to stdout as the hook's `additionalContext` and exits with 0.
   */
  report?: HookReport;
}

// A PostToolUse hook's output that adds the problems to the agent's context.
const hookContextOutput = (collected: string[]): string =>
  `${JSON.stringify({
    hookSpecificOutput: {
      additionalContext: `\`ultracite fix\` left these problems in the files you edited:\n\n${collected.join("\n").trim()}`,
      hookEventName: "PostToolUse",
    },
  })}\n`;

const runLinterFixes = (
  linter: NonNullable<ReturnType<typeof detectLinter>>,
  files: string[],
  passthrough: string[],
  io: FixIo
): void => {
  switch (linter) {
    // Lint fixes first, then the formatter: a fixer can insert unformatted
    // code (curly braces, split imports, requoted font names), and only a
    // later format pass leaves the file in the formatter's shape. The agent
    // adapters in agent-fix/linters.ts follow the same order.
    case "eslint": {
      runSteps([
        () => runEslintFix(files, passthrough, io),
        () => runStylelintFix(files, [], io),
        () => runPrettierFix(files, [], io),
      ]);
      break;
    }

    case "oxlint": {
      runSteps([
        () => runOxlintFix(files, passthrough, io),
        () => runOxfmtFix(files, [], io),
      ]);
      break;
    }

    case "bun": {
      assertBunCanLint();
      runSteps([
        () => runBunLintFix(files, passthrough, io),
        () => runBunFmtFix(files, bunFileSelectionArgs(passthrough), io),
      ]);
      break;
    }

    case "biome": {
      runBiomeFix(files, passthrough, io);
      break;
    }

    default: {
      throw new Error(`Unknown linter: ${String(linter satisfies never)}`);
    }
  }
};

// A post-edit hook runs between an agent's edits, so an import the agent has
// just added is still unused and the autofix would delete it before the code
// that uses it lands (#483). The Biome hook command skips noUnusedImports for
// the same reason. Turned off this way, the rule doesn't report either, but
// no-unused-vars still does.
const eslintPassthrough = (passthrough: string[], hook: boolean): string[] =>
  hook
    ? [...passthrough, "--rule", "unused-imports/no-unused-imports:off"]
    : passthrough;

// The plain path stays synchronous (and throws synchronously); only agent
// mode returns a promise. The command action awaits either shape.
export const fix = (
  files: string[],
  linterArgs: string[] = [],
  { agent, hook = false, report = "none" }: FixOptions = {}
): Promise<void> | void => {
  const linter = detectLinter();
  const normalizedFiles = normalizeFileArgs(files);

  if (!linter) {
    throw new UltraciteSetupError(NO_LINTER_CONFIG_MESSAGE);
  }

  const passthrough =
    linter === "eslint"
      ? eslintPassthrough(dropUnsupportedUnsafe(linterArgs), hook)
      : linterArgs;

  if (agent) {
    return runAgentFix({
      agent,
      files: normalizedFiles,
      linter,
      passthrough,
    });
  }

  if (report === "none") {
    runLinterFixes(linter, normalizedFiles, passthrough, { stdio: "inherit" });

    return;
  }

  if (report === "context") {
    const collected: string[] = [];

    try {
      runLinterFixes(linter, normalizedFiles, passthrough, {
        collected,
        stdio: "pipe",
      });
    } catch (error) {
      if (!(error instanceof LinterExitError)) {
        throw error;
      }

      process.stdout.write(hookContextOutput(collected));
    }

    return;
  }

  try {
    runLinterFixes(linter, normalizedFiles, passthrough, {
      stdio: STDOUT_TO_STDERR,
    });
  } catch (error) {
    if (error instanceof LinterExitError) {
      throw new LinterExitError(error.commandName, HOOK_FEEDBACK_EXIT_CODE);
    }

    throw error;
  }
};
