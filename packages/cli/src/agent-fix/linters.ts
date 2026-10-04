import {
  buildUnresolvableBiomeConfigMessage,
  findUnresolvableBiomeConfig,
  UltraciteSetupError,
} from "../config-resolution";
import { toStylelintTargets } from "../linter-args";
import { spawnSync } from "../spawn-sync";
import type { Linter } from "../utils";
import type { Diagnostic, LinterAdapter } from "./types";

const STDERR_TAIL_LENGTH = 500;

/**
 * Linters exit non-zero whenever diagnostics remain, which is the expected
 * state here — only a failure to spawn or a signal kill is an actual error.
 */
// A repo with a few thousand remaining diagnostics can exceed the default
// output buffer and abort the run with ENOBUFS, so raise it explicitly.
const PIPED_MAX_BUFFER = 512 * 1024 * 1024;

const runPiped = (command: string, args: string[]): string => {
  const result = spawnSync(command, args, {
    maxBuffer: PIPED_MAX_BUFFER,
  });

  if (result.error) {
    throw new Error(`Failed to run ${command}: ${result.error.message}`);
  }

  if (result.status === null) {
    throw new Error(
      `${command} was killed by signal ${result.signal ?? "unknown"}`
    );
  }

  return String(result.stdout ?? "");
};

/**
 * Parse a linter's JSON report. The type argument names the reporter's
 * schema; every field in those schemas is optional and defaulted by the
 * caller, so a payload that doesn't match degrades to empty diagnostics
 * instead of crashing.
 */
const parseJsonOutput = <T>(command: string, stdout: string): T => {
  try {
    // SAFETY: T is a reporter schema whose fields are all optional and
    // defaulted downstream, so an unexpected payload can't be misused.
    return JSON.parse(stdout) as T;
  } catch {
    throw new Error(
      `Failed to parse JSON output from ${command}: ${stdout.slice(0, STDERR_TAIL_LENGTH) || "(empty output)"}`
    );
  }
};

const toTargets = (files: string[], fallback: string): string[] =>
  files.length > 0 ? files : [fallback];

interface OxlintLabel {
  span?: { column?: number; line?: number };
}

interface OxlintDiagnostic {
  code?: string;
  filename?: string;
  help?: string;
  labels?: OxlintLabel[];
  message?: string;
  severity?: string;
  url?: string;
}

interface OxlintReport {
  diagnostics?: OxlintDiagnostic[];
}

const parseOxlintDiagnostics = (stdout: string): Diagnostic[] => {
  const parsed = parseJsonOutput<OxlintReport>("oxlint", stdout);
  const diagnostics: Diagnostic[] = [];

  for (const diagnostic of parsed.diagnostics ?? []) {
    if (!diagnostic.filename) {
      continue;
    }

    const span = diagnostic.labels?.[0]?.span;

    diagnostics.push({
      column: span?.column ?? 1,
      file: diagnostic.filename,
      help: diagnostic.help,
      line: span?.line ?? 1,
      message: diagnostic.message ?? "",
      raw: diagnostic,
      rule: diagnostic.code ?? "oxlint",
      severity: diagnostic.severity ?? "error",
      url: diagnostic.url,
    });
  }

  return diagnostics;
};

// Lint fixes first, then the formatter, matching the plain `fix` path: a
// fixer can insert unformatted code and oxfmt is not a diagnostic source, so
// a formatter-first pass would report "no issues" on a file that still fails
// `oxfmt --check`. The diagnostics handed to the agent come from a final
// report-only pass so their line numbers reflect the formatted file.
const runOxlintPass = (
  files: string[],
  passthrough: string[]
): Diagnostic[] => {
  const hasUnsafe = passthrough.includes("--unsafe");
  const filteredPassthrough = passthrough.filter((arg) => arg !== "--unsafe");
  const targets = toTargets(files, ".");

  runPiped("oxlint", [
    hasUnsafe ? "--fix-dangerously" : "--fix",
    ...filteredPassthrough,
    ...targets,
  ]);

  runPiped("oxfmt", ["--write", ...targets]);

  // The JSON reporter goes after the passthrough so a user-supplied format
  // flag can't override it and break the parser.
  const stdout = runPiped("oxlint", [
    ...filteredPassthrough,
    "-f",
    "json",
    ...targets,
  ]);

  return parseOxlintDiagnostics(stdout);
};

const oxlintAdapter: LinterAdapter = {
  fixAndCollect: runOxlintPass,
  name: "Oxlint",
  verify: (file, passthrough) => runOxlintPass([file], passthrough),
};

interface BiomeDiagnostic {
  category?: string;
  location?: {
    path?: string | { file?: string };
    start?: { column?: number; line?: number };
  };
  message?: string;
  severity?: string;
}

const biomeDiagnosticFile = (diagnostic: BiomeDiagnostic): string | null => {
  const diagnosticPath = diagnostic.location?.path;

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- decoding Biome's JSON reporter, where `location.path` is either a string or a { file } object
  if (typeof diagnosticPath === "string") {
    return diagnosticPath;
  }

  return diagnosticPath?.file ?? null;
};

interface BiomeReport {
  diagnostics?: BiomeDiagnostic[];
}

const parseBiomeDiagnostics = (stdout: string): Diagnostic[] => {
  const parsed = parseJsonOutput<BiomeReport>("biome", stdout);
  const diagnostics: Diagnostic[] = [];

  for (const diagnostic of parsed.diagnostics ?? []) {
    const file = biomeDiagnosticFile(diagnostic);

    if (!file) {
      continue;
    }

    diagnostics.push({
      column: diagnostic.location?.start?.column ?? 1,
      file,
      line: diagnostic.location?.start?.line ?? 1,
      message: diagnostic.message ?? "",
      raw: diagnostic,
      rule: diagnostic.category ?? "biome",
      severity: diagnostic.severity ?? "error",
    });
  }

  return diagnostics;
};

const runBiomePass = (files: string[], passthrough: string[]): Diagnostic[] => {
  const unresolvableConfig = findUnresolvableBiomeConfig();

  if (unresolvableConfig) {
    throw new UltraciteSetupError(
      buildUnresolvableBiomeConfigMessage(unresolvableConfig)
    );
  }

  // The JSON reporter goes after the passthrough so a user-supplied reporter
  // flag can't override it and break the parser.
  const stdout = runPiped("biome", [
    "check",
    "--write",
    "--no-errors-on-unmatched",
    ...passthrough,
    "--reporter=json",
    ...toTargets(files, "./"),
  ]);

  return parseBiomeDiagnostics(stdout);
};

const biomeAdapter: LinterAdapter = {
  fixAndCollect: runBiomePass,
  name: "Biome",
  verify: (file, passthrough) => runBiomePass([file], passthrough),
};

interface EslintMessage {
  column?: number;
  line?: number;
  message?: string;
  ruleId?: string | null;
  severity?: number;
}

interface EslintResult {
  filePath?: string;
  messages?: EslintMessage[];
}

const parseEslintDiagnostics = (stdout: string): Diagnostic[] => {
  const parsed = parseJsonOutput<EslintResult[]>("eslint", stdout);
  const diagnostics: Diagnostic[] = [];

  for (const result of Array.isArray(parsed) ? parsed : []) {
    if (!result.filePath) {
      continue;
    }

    for (const message of result.messages ?? []) {
      diagnostics.push({
        column: message.column ?? 1,
        file: result.filePath,
        line: message.line ?? 1,
        message: message.message ?? "",
        raw: message,
        rule: message.ruleId ?? "eslint",
        severity: message.severity === 2 ? "error" : "warning",
      });
    }
  }

  return diagnostics;
};

/**
 * Stylelint and Prettier run as plain autofix steps — their issues are not
 * handed to the agent in v1. The order matches the plain fix flow: ESLint,
 * then Stylelint, then Prettier, so every fixer's output gets formatted. A
 * final report-only ESLint pass collects the diagnostics so their line
 * numbers reflect the formatted file.
 */
const runEslintPass = (
  files: string[],
  passthrough: string[]
): Diagnostic[] => {
  const targets = toTargets(files, ".");

  runPiped("eslint", ["--fix", ...passthrough, ...targets]);

  const stylelintTargets = toStylelintTargets(files);

  if (stylelintTargets.length > 0) {
    runPiped("stylelint", [
      "--fix",
      "--allow-empty-input",
      ...stylelintTargets,
    ]);
  }

  runPiped("prettier", ["--write", ...targets]);

  // The JSON reporter goes after the passthrough so a user-supplied format
  // flag can't override it and break the parser.
  const stdout = runPiped("eslint", [...passthrough, "-f", "json", ...targets]);

  return parseEslintDiagnostics(stdout);
};

const eslintAdapter: LinterAdapter = {
  fixAndCollect: runEslintPass,
  name: "ESLint",
  verify: (file, passthrough) => runEslintPass([file], passthrough),
};

const linterAdapters = {
  biome: biomeAdapter,
  eslint: eslintAdapter,
  oxlint: oxlintAdapter,
} satisfies Record<Linter, LinterAdapter>;

export const getLinterAdapter = (linter: Linter): LinterAdapter =>
  linterAdapters[linter];
