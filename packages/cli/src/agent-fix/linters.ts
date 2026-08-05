import {
  buildUnresolvableBiomeConfigMessage,
  findUnresolvableBiomeConfig,
  UltraciteSetupError,
} from "../config-resolution";
import { toStylelintTargets } from "../linter-args";
import { runCommandSync } from "../run-command";
import type { Linter } from "../utils";
import type { Diagnostic, LinterAdapter } from "./types";

const STDERR_TAIL_LENGTH = 500;

/**
 * Linters exit non-zero whenever diagnostics remain, which is the expected
 * state here — only a failure to spawn or a signal kill is an actual error.
 */
// spawnSync's default maxBuffer is 1MB — a repo with a few thousand remaining
// diagnostics easily exceeds that and would abort the run with ENOBUFS.
const PIPED_MAX_BUFFER = 512 * 1024 * 1024;

const runPiped = (command: string, args: string[]): string => {
  const result = runCommandSync(command, args, {
    encoding: "utf-8",
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

const parseJsonOutput = (command: string, stdout: string): unknown => {
  try {
    return JSON.parse(stdout);
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

const parseOxlintDiagnostics = (stdout: string): Diagnostic[] => {
  const parsed = parseJsonOutput("oxlint", stdout) as {
    diagnostics?: OxlintDiagnostic[];
  };
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

const runOxlintPass = (
  files: string[],
  passthrough: string[]
): Diagnostic[] => {
  runPiped("oxfmt", ["--write", ...toTargets(files, ".")]);

  const hasUnsafe = passthrough.includes("--unsafe");
  const filteredPassthrough = passthrough.filter((arg) => arg !== "--unsafe");
  // The JSON reporter goes after the passthrough so a user-supplied format
  // flag can't override it and break the parser.
  const stdout = runPiped("oxlint", [
    hasUnsafe ? "--fix-dangerously" : "--fix",
    ...filteredPassthrough,
    "-f",
    "json",
    ...toTargets(files, "."),
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

  if (typeof diagnosticPath === "string") {
    return diagnosticPath;
  }

  return diagnosticPath?.file ?? null;
};

const parseBiomeDiagnostics = (stdout: string): Diagnostic[] => {
  const parsed = parseJsonOutput("biome", stdout) as {
    diagnostics?: BiomeDiagnostic[];
  };
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
  const parsed = parseJsonOutput("eslint", stdout) as EslintResult[];
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
 * Prettier and Stylelint run as plain autofix steps — their issues are not
 * handed to the agent in v1, matching the ESLint-centric plain fix flow.
 */
const runEslintPass = (
  files: string[],
  passthrough: string[]
): Diagnostic[] => {
  runPiped("prettier", ["--write", ...toTargets(files, ".")]);

  // The JSON reporter goes after the passthrough so a user-supplied format
  // flag can't override it and break the parser.
  const stdout = runPiped("eslint", [
    "--fix",
    ...passthrough,
    "-f",
    "json",
    ...toTargets(files, "."),
  ]);

  return parseEslintDiagnostics(stdout);
};

const eslintAdapter: LinterAdapter = {
  fixAndCollect: (files, passthrough) => {
    const diagnostics = runEslintPass(files, passthrough);
    const stylelintTargets = toStylelintTargets(files);

    if (stylelintTargets.length > 0) {
      runPiped("stylelint", [
        "--fix",
        "--allow-empty-input",
        ...stylelintTargets,
      ]);
    }

    return diagnostics;
  },
  name: "ESLint",
  verify: (file, passthrough) => runEslintPass([file], passthrough),
};

const linterAdapters: Record<Linter, LinterAdapter> = {
  biome: biomeAdapter,
  eslint: eslintAdapter,
  oxlint: oxlintAdapter,
};

export const getLinterAdapter = (linter: Linter): LinterAdapter =>
  linterAdapters[linter];
