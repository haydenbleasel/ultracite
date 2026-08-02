import { afterEach, describe, expect, mock, test } from "bun:test";
import path from "node:path";

import { agentAdapters, assertAgentAvailable } from "../src/agent-fix/agents";
import { partitionByRemaining } from "../src/agent-fix/diff";
import { buildPrompt } from "../src/agent-fix/prompt";
import type { Diagnostic } from "../src/agent-fix/types";

const diagnostic = (overrides: Partial<Diagnostic> = {}): Diagnostic => ({
  column: 5,
  file: "src/foo.ts",
  line: 12,
  message: "'result' is assigned a value but never used.",
  raw: {},
  rule: "eslint(no-unused-vars)",
  severity: "error",
  ...overrides,
});

describe("agent-fix prompt", () => {
  test("includes the resolved file path, numbered issues, JSON path, and rules", () => {
    const prompt = buildPrompt(
      "src/foo.ts",
      [
        diagnostic(),
        diagnostic({
          column: 1,
          line: 40,
          message: "Promise executor functions should not be `async`.",
          rule: "eslint(no-async-promise-executor)",
        }),
      ],
      "/tmp/ultracite-x/foo.ts.json"
    );

    expect(prompt).toContain(`File: ${path.resolve("src/foo.ts")}`);
    expect(prompt).toContain(
      "1. line 12, col 5 — eslint(no-unused-vars): 'result' is assigned a value but never used."
    );
    expect(prompt).toContain(
      "2. line 40, col 1 — eslint(no-async-promise-executor): Promise executor functions should not be `async`."
    );
    expect(prompt).toContain("/tmp/ultracite-x/foo.ts.json");
    expect(prompt).toContain("Edit only the file above.");
    expect(prompt).toContain("Do not add suppression comments");
  });
});

describe("agent adapters", () => {
  afterEach(() => {
    mock.restore();
  });

  test("claude adapter builds a non-interactive, edit-scoped invocation", () => {
    expect(agentAdapters.claude.buildArgs("do the fix")).toEqual([
      "-p",
      "do the fix",
      "--permission-mode",
      "acceptEdits",
      "--allowedTools",
      "Read,Edit,Write,Grep,Glob",
    ]);
  });

  test("codex adapter builds a full-auto exec invocation", () => {
    expect(agentAdapters.codex.buildArgs("do the fix")).toEqual([
      "exec",
      "--full-auto",
      "do the fix",
    ]);
  });

  test("assertAgentAvailable passes when the CLI reports a version", () => {
    const mockSpawn = mock((_cmd: string, _args: string[]) => ({
      status: 0,
      stdout: "2.0.1",
    }));
    mock.module("cross-spawn", () => ({ sync: mockSpawn }));

    expect(() => assertAgentAvailable(agentAdapters.claude)).not.toThrow();
    const [call] = mockSpawn.mock.calls;
    expect(call[0]).toBe("claude");
    expect(call[1]).toEqual(["--version"]);
  });

  test("assertAgentAvailable throws an install hint when the CLI is missing", () => {
    const mockSpawn = mock(() => ({
      error: new Error("ENOENT"),
      status: null,
    }));
    mock.module("cross-spawn", () => ({ sync: mockSpawn }));

    expect(() => assertAgentAvailable(agentAdapters.codex)).toThrow(
      "npm install -g @openai/codex"
    );
  });
});

describe("diagnostic diffing", () => {
  test("partitions cleared and still-present diagnostics by rule and message", () => {
    const kept = diagnostic();
    const fixed = diagnostic({ message: "other", rule: "eslint(no-eval)" });
    const remaining = [diagnostic({ line: 99 })];

    const result = partitionByRemaining([kept, fixed], remaining);

    expect(result.cleared).toEqual([fixed]);
    expect(result.still).toEqual([kept]);
    expect(result.introduced).toBe(0);
  });

  test("counts duplicate diagnostics individually", () => {
    const first = diagnostic();
    const second = diagnostic({ line: 20 });

    const result = partitionByRemaining([first, second], [diagnostic()]);

    expect(result.still).toHaveLength(1);
    expect(result.cleared).toHaveLength(1);
    expect(result.introduced).toBe(0);
  });

  test("reports diagnostics introduced by the fix", () => {
    const result = partitionByRemaining(
      [diagnostic()],
      [diagnostic({ message: "brand new", rule: "eslint(no-eval)" })]
    );

    expect(result.cleared).toHaveLength(1);
    expect(result.still).toHaveLength(0);
    expect(result.introduced).toBe(1);
  });
});
