import pc from "picocolors";
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

// Custom orange using 256-color ANSI code (color 208)
const orange = (text: string) => `\x1b[38;5;208m${text}\x1b[39m`;

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
      // Error line: ">" + lineNum = 6 chars before " │ "
      snippetLines.push(
        `${orange(">")}${pc.dim(lineNum)} ${pc.gray("│")} ${lineContent}`
      );
      // Pointer line: 6 spaces before " │ " to match
      const pointerPadding = " ".repeat(column - 1);
      const spanLength = Math.min(
        span[1] - span[0],
        lineContent.length - column + 1
      );
      const pointer = "^".repeat(Math.max(1, spanLength));
      snippetLines.push(
        `${pc.dim("      ")} ${pc.gray("│")} ${pointerPadding}${orange(pointer)}`
      );
    } else {
      // Non-error line: " " + lineNum = 6 chars before " │ "
      snippetLines.push(` ${pc.dim(lineNum)} ${pc.gray("│")} ${lineContent}`);
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

const separator = pc.dim("─".repeat(60));

// Convert camelCase to kebab-case (e.g., noUnusedVariables -> no-unused-variables)
const toKebabCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

// Generate documentation URL from category (e.g., lint/correctness/noUnusedVariables)
const getDocumentationUrl = (category: string): string | null => {
  const parts = category.split("/");
  if (parts.length < 3 || parts[0] !== "lint") {
    return null;
  }
  const ruleName = parts.at(-1);
  if (!ruleName) {
    return null;
  }
  return `https://biomejs.dev/linter/rules/${toKebabCase(ruleName)}/`;
};

const formatHeader = (command: "check" | "fix"): string[] => [
  "",
  `${orange("Ultracite")} ${orange(`v${packageJson.version}`)} ${command}`,
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
    const errorWord = totalErrors !== 1 ? "errors" : "error";
    lines.push(`${pc.dim("Found")} ${totalErrors} ${errorWord}${pc.dim(".")}`);
  }

  const fileWord = totalFiles !== 1 ? "files" : "file";
  lines.push(
    `${pc.green("✓")} ${pc.dim("Finished in")} ${duration} ${pc.dim("on")} ${totalFiles} ${fileWord}${pc.dim(".")}`
  );

  if (command === "fix" && summary.changed > 0) {
    const changedWord = summary.changed !== 1 ? "files" : "file";
    lines.push(
      `${pc.dim("Fixed")} ${summary.changed} ${changedWord}${pc.dim(".")}`
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

  lines.push(`${orange(locationStr)} ${pc.dim(category)}`);
  lines.push(pc.dim(description));

  if (location.span && location.sourceCode) {
    lines.push("");
    const snippet = getCodeSnippet(location.sourceCode, location.span);
    for (const snippetLine of snippet) {
      lines.push(`  ${snippetLine}`);
    }
  }

  for (const advice of advices.advices) {
    if (advice.log) {
      const [level, messages] = advice.log;
      const icon = level === "info" ? orange("i") : orange("!");
      const adviceText = pc.dim(messages.map((m) => m.content).join(""));
      lines.push("");
      lines.push(`  ${icon} ${adviceText}`);
    }
  }

  // Add documentation link for lint rules
  const docUrl = getDocumentationUrl(category);
  if (docUrl) {
    lines.push("");
    lines.push(`  ${pc.cyan("→")} ${pc.dim("Docs:")} ${pc.cyan(docUrl)}`);
  }

  lines.push("");
  lines.push(`${separator}`);
  lines.push("");

  return lines;
};

const formatDiagnostics = (
  diagnostics: BiomeDiagnostic[],
  command: "check" | "fix"
): string[] => {
  // Show all remaining diagnostics - if Biome fixed something, it won't be in the array
  if (diagnostics.length === 0) {
    return [];
  }

  const lines: string[] = [""];
  const heading =
    command === "fix"
      ? "Here are the issues we couldn't fix automatically:"
      : "Issues found:";
  lines.push(`${pc.yellow(heading)}`);
  lines.push("");

  for (const diagnostic of diagnostics) {
    lines.push(...formatDiagnostic(diagnostic));
  }

  return lines;
};

export const formatBiomeOutput = (
  jsonOutput: string,
  command: "check" | "fix"
): { output: string; hasErrors: boolean } => {
  if (!jsonOutput.trim()) {
    return {
      output: `${orange("Ultracite")} ${orange(`v${packageJson.version}`)} ${pc.magenta(command)}\n${pc.red("Error:")} No output received from Biome. The command may have failed silently.`,
      hasErrors: true,
    };
  }

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
      output: `${orange("Ultracite")} ${orange(`v${packageJson.version}`)} ${pc.magenta(command)}\n${pc.red("Error:")} Failed to parse Biome output.\n\nRaw output:\n${jsonOutput}`,
      hasErrors: true,
    };
  }
};
