import { afterEach, describe, expect, mock, test } from "bun:test";
import path from "node:path";

import { agentAdapters, assertAgentAvailable } from "../src/agent-fix/agents";
import { partitionByRemaining } from "../src/agent-fix/diff";
import {
  buildPrompt,
  buildRetryPrompt,
  parseLeftForReview,
} from "../src/agent-fix/prompt";
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
    expect(prompt).toContain("Fix the underlying problem");
    expect(prompt).toContain("`Left for review: 2, 3`");
  });

  test("retry prompt calls out the failed previous attempt", () => {
    const prompt = buildRetryPrompt(
      "src/foo.ts",
      { introduced: [], still: [diagnostic()] },
      "/tmp/ultracite-x/foo.ts.json",
      2
    );

    expect(prompt).toContain("This is attempt 2");
    expect(prompt).toContain("did not resolve them");
    expect(prompt).toContain("structurally different approach");
    expect(prompt).toContain(
      "1. line 12, col 5 — eslint(no-unused-vars): 'result' is assigned a value but never used."
    );
    expect(prompt).toContain("Do not add suppression comments");
  });

  test("retry prompt builds on an edit that cleared its issues and tripped new ones", () => {
    const prompt = buildRetryPrompt(
      "src/foo.ts",
      {
        introduced: [
          diagnostic({
            message: "Use <button> instead of the button role.",
            rule: "jsx-a11y/prefer-tag-over-role",
          }),
        ],
        still: [],
      },
      "/tmp/ultracite-x/foo.ts.json",
      2
    );

    expect(prompt).toContain("resolved the issues it was given");
    expect(prompt).toContain("build on it rather than undoing it");
    expect(prompt).not.toContain("did not resolve");
    expect(prompt).not.toContain("structurally different approach");
    expect(prompt).toContain(
      "1. line 12, col 5 — jsx-a11y/prefer-tag-over-role: Use <button> instead of the button role."
    );
  });

  test("retry prompt splits issues still reported from new ones and numbers them in order", () => {
    const prompt = buildRetryPrompt(
      "src/foo.ts",
      {
        introduced: [diagnostic({ message: "new", rule: "no-alert" })],
        still: [diagnostic()],
      },
      "/tmp/ultracite-x/foo.ts.json",
      3
    );

    expect(prompt).toContain("This is attempt 3");
    expect(prompt).toContain(
      "Still reported after the previous edit:\n1. line 12, col 5 — eslint(no-unused-vars)"
    );
    expect(prompt).toContain(
      "New since the previous edit:\n2. line 12, col 5 — no-alert: new"
    );
    expect(prompt).toContain(
      "For the issues still reported, the previous approach was insufficient."
    );
    expect(prompt).toContain("For the new issues, build on the previous edit");
  });
});

describe("issues left for review", () => {
  const issues = [
    diagnostic(),
    diagnostic({ message: "second", rule: "jsx-a11y/heading-has-content" }),
    diagnostic({ message: "third", rule: "no-alert" }),
  ];

  test("finds the issues the agent's final message lists by number", () => {
    const result = parseLeftForReview(
      "I fixed the first issue.\n\nThe heading would end up inside the button.\n\nLeft for review: 2, 3",
      issues
    );

    expect(result?.issues).toEqual([issues[1], issues[2]]);
    expect(result?.explanation).toBe(
      "I fixed the first issue.\n\nThe heading would end up inside the button."
    );
  });

  test("ignores markdown around the label", () => {
    const result = parseLeftForReview("**Left for review:** 2", issues);

    expect(result?.issues).toEqual([issues[1]]);
    expect(result?.explanation).toBe("");
  });

  test("returns null without the line or without a valid issue number", () => {
    expect(parseLeftForReview("Fixed both issues.", issues)).toBeNull();
    expect(parseLeftForReview("Left for review: none", issues)).toBeNull();
    expect(parseLeftForReview("Left for review: 7", issues)).toBeNull();
    expect(parseLeftForReview("", issues)).toBeNull();
  });
});

describe("agent adapters", () => {
  afterEach(() => {
    mock.restore();
  });

  test("claude adapter builds a non-interactive, edit-scoped invocation", () => {
    // No prompt argument: `claude -p` reads the prompt from stdin.
    expect(agentAdapters.claude.args).toEqual([
      "-p",
      "--permission-mode",
      "acceptEdits",
      "--allowedTools",
      "Read,Edit,Write,Grep,Glob",
    ]);
  });

  test("codex adapter builds a workspace-write sandboxed exec invocation", () => {
    // `-` reads the prompt from stdin; the git check would fail every file
    // of a project that isn't a repository.
    expect(agentAdapters.codex.args).toEqual([
      "exec",
      "--sandbox",
      "workspace-write",
      "--skip-git-repo-check",
      "-",
    ]);
  });

  test("assertAgentAvailable passes when the CLI reports a version", () => {
    const mockSpawn = mock((_cmd: string, _args: string[]) => ({
      status: 0,
      stdout: "2.0.1",
    }));

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    expect(() => assertAgentAvailable(agentAdapters.claude)).not.toThrow();
    const [call] = mockSpawn.mock.calls;
    expect(call[0]).toBe("claude");
    expect(call[1]).toEqual(["--version"]);
  });

  test("assertAgentAvailable accepts a clean exit with empty stdout", () => {
    const mockSpawn = mock((_cmd: string, _args: string[]) => ({
      status: 0,
      stdout: "",
    }));

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    expect(() => assertAgentAvailable(agentAdapters.claude)).not.toThrow();
  });

  test("assertAgentAvailable throws an install hint when the CLI is missing", () => {
    const mockSpawn = mock(() => ({
      error: new Error("ENOENT"),
      status: null,
    }));

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

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
    expect(result.stillReported).toEqual(remaining);
    expect(result.introduced).toEqual([]);
  });

  test("counts duplicate diagnostics individually", () => {
    const first = diagnostic();
    const second = diagnostic({ line: 20 });

    const result = partitionByRemaining([first, second], [diagnostic()]);

    expect(result.still).toEqual([first]);
    expect(result.cleared).toEqual([second]);
    expect(result.introduced).toEqual([]);
  });

  test("reports diagnostics introduced by the fix", () => {
    const brandNew = diagnostic({
      message: "brand new",
      rule: "eslint(no-eval)",
    });

    const result = partitionByRemaining([diagnostic()], [brandNew]);

    expect(result.cleared).toHaveLength(1);
    expect(result.still).toHaveLength(0);
    expect(result.introduced).toEqual([brandNew]);
  });
});
