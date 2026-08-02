import { describe, expect, test } from "bun:test";

import { createRenderer } from "../src/agent-fix/renderer";
import type { FileGroup } from "../src/agent-fix/renderer";
import type { Diagnostic } from "../src/agent-fix/types";

const issue = (overrides: Partial<Diagnostic> = {}): Diagnostic => ({
  column: 5,
  file: "src/foo.ts",
  line: 12,
  message: "unused variable",
  raw: {},
  rule: "no-unused-vars",
  severity: "error",
  ...overrides,
});

const groups: FileGroup[] = [
  { file: "src/foo.ts", issues: [issue(), issue({ line: 20 })] },
  { file: "src/bar.ts", issues: [issue({ file: "src/bar.ts" })] },
];

const stripAnsi = (line: string): string =>
  line
    .split("\u001B")
    .map((segment, index) =>
      index === 0 ? segment : segment.replace(/^\[[0-9]*[A-Za-z]/u, "")
    )
    .join("")
    .replaceAll("\r", "");

const createSink = () => {
  const chunks: string[] = [];
  return {
    output: () => chunks.join(""),
    write: (text: string) => {
      chunks.push(text);
      return true;
    },
  };
};

describe("agent-fix renderer", () => {
  test("non-TTY mode prints plain per-file and per-issue lines without ANSI", () => {
    const sink = createSink();
    const renderer = createRenderer(groups, {
      agentLabel: "Claude Code",
      isTTY: false,
      out: sink,
    });

    renderer.startFile("src/foo.ts");
    renderer.settleFile("src/foo.ts", [
      { fixed: true, issue: issue() },
      { fixed: false, issue: issue({ line: 20 }) },
    ]);
    renderer.startFile("src/bar.ts");
    renderer.settleFile(
      "src/bar.ts",
      [{ fixed: true, issue: issue({ file: "src/bar.ts" }) }],
      "Claude Code timed out after 5 minutes."
    );
    renderer.stop();

    const output = sink.output();
    expect(output).toContain("Fixing src/foo.ts (2 issues) with Claude Code…");
    expect(output).toContain("Fixing src/bar.ts (1 issue) with Claude Code…");
    expect(output).toContain(
      "✓ src/foo.ts:12:5  no-unused-vars — unused variable"
    );
    expect(output).toContain(
      "✗ src/foo.ts:20:5  no-unused-vars — unused variable"
    );
    expect(output).toContain("Claude Code timed out after 5 minutes.");
    expect(output).not.toContain("\u001B[");
  });

  test("TTY mode animates the active block and settles lines with icons", () => {
    const sink = createSink();
    const renderer = createRenderer(groups, {
      agentLabel: "Claude Code",
      columns: 120,
      frameIntervalMs: 60_000,
      isTTY: true,
      out: sink,
    });

    renderer.startFile("src/foo.ts");
    const started = sink.output();
    // Two spinner lines plus the queued-summary line for the pending file.
    expect(started).toContain("⠋");
    expect(started).toContain("… 1 more issue in 1 file");

    renderer.settleFile("src/foo.ts", [
      { fixed: true, issue: issue() },
      { fixed: false, issue: issue({ line: 20 }) },
    ]);
    renderer.stop();

    const output = sink.output();
    expect(output).toContain("✓");
    expect(output).toContain("✗");
    // Settling rewrites the animated block in place via cursor movement.
    expect(output).toContain("\u001B[3A");
  });

  test("TTY mode truncates long messages to the terminal width", () => {
    const sink = createSink();
    const renderer = createRenderer(
      [{ file: "src/foo.ts", issues: [issue({ message: "x".repeat(300) })] }],
      {
        agentLabel: "Claude Code",
        columns: 60,
        frameIntervalMs: 60_000,
        isTTY: true,
        out: sink,
      }
    );

    renderer.startFile("src/foo.ts");
    renderer.stop();
    for (const line of sink.output().split("\n")) {
      expect(stripAnsi(line).length).toBeLessThanOrEqual(60);
    }
  });
});
