import { describe, expect, test } from "bun:test";
import { formatBiomeOutput } from "../src/reporter";

// Regex patterns
const UNSAFE_FIX_REGEX = /unsafe.*fix[^e]/;

// Helper to create mock Biome JSON output
const createMockBiomeOutput = (options: {
  errors?: number;
  warnings?: number;
  changed?: number;
  unchanged?: number;
  suggestedFixesSkipped?: number;
  diagnostics?: Array<{
    category: string;
    severity: "error" | "warning" | "info";
    description: string;
    message: Array<{ content: string; elements: string[] }>;
    advices: {
      advices: Array<{
        log?: [string, Array<{ content: string; elements: string[] }>];
      }>;
    };
    location: {
      path: { file: string };
      span: [number, number] | null;
      sourceCode: string;
    };
    tags: string[];
  }>;
}) =>
  JSON.stringify({
    summary: {
      changed: options.changed ?? 0,
      unchanged: options.unchanged ?? 1,
      matches: 0,
      duration: { secs: 0, nanos: 1_000_000 },
      scannerDuration: { secs: 0, nanos: 1_000_000 },
      errors: options.errors ?? 0,
      warnings: options.warnings ?? 0,
      infos: 0,
      skipped: 0,
      suggestedFixesSkipped: options.suggestedFixesSkipped ?? 0,
      diagnosticsNotPrinted: 0,
    },
    diagnostics: options.diagnostics ?? [],
    command: "check",
  });

describe("formatBiomeOutput", () => {
  test("shows skipped unsafe fixes message when suggestedFixesSkipped > 0", () => {
    const output = createMockBiomeOutput({
      suggestedFixesSkipped: 3,
      errors: 3,
    });

    const result = formatBiomeOutput(output, "fix");

    expect(result.output).toContain("Skipped");
    expect(result.output).toContain("3");
    expect(result.output).toContain("unsafe");
    expect(result.output).toContain("fixes");
    expect(result.output).toContain("--unsafe");
  });

  test("uses singular 'fix' when only 1 unsafe fix skipped", () => {
    const output = createMockBiomeOutput({
      suggestedFixesSkipped: 1,
      errors: 1,
    });

    const result = formatBiomeOutput(output, "fix");

    expect(result.output).toContain("Skipped");
    expect(result.output).toContain("1");
    expect(result.output).toMatch(UNSAFE_FIX_REGEX);
  });

  test("does not show skipped message when suggestedFixesSkipped is 0", () => {
    const output = createMockBiomeOutput({
      suggestedFixesSkipped: 0,
      changed: 1,
    });

    const result = formatBiomeOutput(output, "fix");

    expect(result.output).not.toContain("Skipped");
    expect(result.output).not.toContain("--unsafe");
  });

  test("does not show skipped message for check command", () => {
    const output = createMockBiomeOutput({
      suggestedFixesSkipped: 3,
      errors: 3,
    });

    const result = formatBiomeOutput(output, "check");

    expect(result.output).not.toContain("Skipped");
    expect(result.output).not.toContain("--unsafe");
  });

  test("shows fixed files count when files were changed", () => {
    const output = createMockBiomeOutput({
      changed: 5,
      unchanged: 10,
    });

    const result = formatBiomeOutput(output, "fix");

    expect(result.output).toContain("Fixed");
    expect(result.output).toContain("5");
    expect(result.output).toContain("files");
  });

  test("shows both fixed count and skipped message when both present", () => {
    const output = createMockBiomeOutput({
      changed: 2,
      suggestedFixesSkipped: 3,
      errors: 3,
    });

    const result = formatBiomeOutput(output, "fix");

    expect(result.output).toContain("Fixed");
    expect(result.output).toContain("2");
    expect(result.output).toContain("Skipped");
    expect(result.output).toContain("3");
    expect(result.output).toContain("--unsafe");
  });

  test("returns error for empty output", () => {
    const result = formatBiomeOutput("", "fix");

    expect(result.hasErrors).toBe(true);
    expect(result.output).toContain("No output received from Biome");
  });

  test("returns error for invalid JSON", () => {
    const result = formatBiomeOutput("not valid json", "fix");

    expect(result.hasErrors).toBe(true);
    expect(result.output).toContain("Failed to parse Biome output");
  });

  test("hasErrors is true when errors > 0", () => {
    const output = createMockBiomeOutput({
      errors: 5,
    });

    const result = formatBiomeOutput(output, "fix");

    expect(result.hasErrors).toBe(true);
  });

  test("hasErrors is false when no errors", () => {
    const output = createMockBiomeOutput({
      errors: 0,
      warnings: 0,
    });

    const result = formatBiomeOutput(output, "fix");

    expect(result.hasErrors).toBe(false);
  });
});
