import process from "node:process";
import packageJson from "../package.json" with { type: "json" };

type BiomeDiagnostic = {
  category: string;
  severity: "error" | "warning" | "info";
  description: string;
  message: Array<{ content: string; elements: string[] }>;
  advices: {
    advices: Array<{
      log?: [string, Array<{ content: string; elements: string[] }>];
      diff?: unknown;
    }>;
  };
  location: {
    path: { file: string };
    span: [number, number] | null;
    sourceCode: string;
  };
  tags: string[];
};

type BiomeSummary = {
  changed: number;
  unchanged: number;
  matches: number;
  duration: { secs: number; nanos: number };
  scannerDuration: { secs: number; nanos: number };
  errors: number;
  warnings: number;
  infos: number;
  skipped: number;
  suggestedFixesSkipped: number;
  diagnosticsNotPrinted: number;
};

type BiomeOutput = {
  summary: BiomeSummary;
  diagnostics: BiomeDiagnostic[];
  command: string;
};

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const isColorSupported = (): boolean => {
  if (process.env.NO_COLOR || process.env.FORCE_COLOR === "0") {
    return false;
  }
  if (process.env.FORCE_COLOR) {
    return true;
  }
  return process.stdout.isTTY === true;
};

const c = (color: keyof typeof colors, text: string): string => {
  if (!isColorSupported()) {
    return text;
  }
  return `${colors[color]}${text}${colors.reset}`;
};

const getLineAndColumn = (
  sourceCode: string,
  span: [number, number]
): { line: number; column: number } => {
  const beforeSpan = sourceCode.slice(0, span[0]);
  const lines = beforeSpan.split("\n");
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
};

const getCodeSnippet = (
  sourceCode: string,
  span: [number, number]
): string[] => {
  const lines = sourceCode.split("\n");
  const { line, column } = getLineAndColumn(sourceCode, span);

  const snippetLines: string[] = [];
  const startLine = Math.max(1, line - 1);
  const endLine = Math.min(lines.length, line + 2);

  for (let i = startLine; i <= endLine; i++) {
    const lineNum = String(i).padStart(5, " ");
    const lineContent = lines[i - 1] || "";

    if (i === line) {
      snippetLines.push(
        `${c("blue", ">")} ${c("dim", lineNum)} ${c("gray", "|")} ${lineContent}`
      );
      // Add the error pointer
      const pointerPadding = " ".repeat(8 + column - 1);
      const spanLength = Math.min(
        span[1] - span[0],
        lineContent.length - column + 1
      );
      const pointer = "^".repeat(Math.max(1, spanLength));
      snippetLines.push(
        `  ${c("dim", "     ")} ${c("gray", "|")} ${pointerPadding}${c("red", pointer)}`
      );
    } else {
      snippetLines.push(
        `  ${c("dim", lineNum)} ${c("gray", "|")} ${lineContent}`
      );
    }
  }

  return snippetLines;
};

const formatDuration = (duration: { secs: number; nanos: number }): string => {
  const totalMs = duration.secs * 1000 + duration.nanos / 1_000_000;
  if (totalMs < 1000) {
    return `${Math.round(totalMs)}ms`;
  }
  return `${(totalMs / 1000).toFixed(2)}s`;
};

const separator = c("dim", "─".repeat(60));

const formatHeader = (command: "check" | "fix"): string[] => [
  "",
  `  ${c("bold", "Ultracite")} ${c("dim", `v${packageJson.version}`)} ${command}`,
];

const formatSummary = (
  summary: BiomeSummary,
  command: "check" | "fix"
): string[] => {
  const lines: string[] = [];
  const totalFiles = summary.changed + summary.unchanged;
  const totalErrors = summary.errors + summary.warnings;
  const duration = formatDuration(summary.duration);

  if (totalErrors > 0) {
    lines.push(
      `  ${c("red", `Found ${totalErrors} error${totalErrors !== 1 ? "s" : ""}.`)}`
    );
  }

  lines.push(
    `  ${c("green", "✓")} Finished in ${duration} on ${totalFiles} file${totalFiles !== 1 ? "s" : ""}.`
  );

  if (command === "fix" && summary.changed > 0) {
    lines.push(
      `  ${c("cyan", `Fixed ${summary.changed} file${summary.changed !== 1 ? "s" : ""}.`)}`
    );
  }

  return lines;
};

const formatDiagnostic = (diagnostic: BiomeDiagnostic): string[] => {
  const lines: string[] = [];
  const { location, category, description, advices } = diagnostic;
  const filePath = location.path.file;

  let locationStr = filePath;
  if (location.span && location.sourceCode) {
    const { line, column } = getLineAndColumn(
      location.sourceCode,
      location.span
    );
    locationStr = `${filePath}:${line}:${column}`;
  }

  lines.push(`  ${c("cyan", locationStr)} ${c("dim", category)}`);
  lines.push(`  ${description}`);

  if (location.span && location.sourceCode) {
    lines.push("");
    const snippet = getCodeSnippet(location.sourceCode, location.span);
    for (const snippetLine of snippet) {
      lines.push(`    ${snippetLine}`);
    }
  }

  for (const advice of advices.advices) {
    if (advice.log) {
      const [level, messages] = advice.log;
      const icon = level === "info" ? c("blue", "i") : c("yellow", "!");
      const adviceText = messages.map((m) => m.content).join("");
      lines.push("");
      lines.push(`    ${icon} ${adviceText}`);
    }
  }

  lines.push("");
  lines.push(`  ${separator}`);
  lines.push("");

  return lines;
};

const formatDiagnostics = (
  diagnostics: BiomeDiagnostic[],
  command: "check" | "fix"
): string[] => {
  const unfixableDiagnostics =
    command === "fix"
      ? diagnostics.filter((d) => !d.tags.includes("fixable"))
      : diagnostics;

  if (unfixableDiagnostics.length === 0) {
    return [];
  }

  const lines: string[] = [""];
  const heading =
    command === "fix"
      ? "Here are the issues we couldn't fix automatically:"
      : "Issues found:";
  lines.push(`  ${c("yellow", heading)}`);
  lines.push("");

  for (const diagnostic of unfixableDiagnostics) {
    lines.push(...formatDiagnostic(diagnostic));
  }

  return lines;
};

export const formatBiomeOutput = (
  jsonOutput: string,
  command: "check" | "fix"
): { output: string; hasErrors: boolean } => {
  try {
    const result: BiomeOutput = JSON.parse(jsonOutput);
    const { summary, diagnostics } = result;

    const lines: string[] = [
      ...formatHeader(command),
      ...formatSummary(summary, command),
      ...formatDiagnostics(diagnostics, command),
    ];

    return {
      output: lines.join("\n"),
      hasErrors: summary.errors > 0,
    };
  } catch {
    return {
      output: jsonOutput,
      hasErrors: true,
    };
  }
};
