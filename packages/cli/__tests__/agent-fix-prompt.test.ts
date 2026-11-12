import { afterEach, describe, expect, mock, test } from "bun:test";
import path from "node:path";

import { agentAdapters, assertAgentAvailable } from "../src/agent-fix/agents";
import {
  partitionByRemaining,
  recordSourceLines,
  releaseSourceLines,
} from "../src/agent-fix/diff";
import {
  buildPrompt,
  buildRetryPrompt,
  parseLeftForReview,
} from "../src/agent-fix/prompt";
import type { Diagnostic } from "../src/agent-fix/types";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

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

  test("tells the agent when leaving an issue is the right result", () => {
    const prompt = buildPrompt(
      "src/foo.ts",
      [diagnostic()],
      "/tmp/ultracite-x/foo.ts.json"
    );

    // A rule that reports a bug is asking for the behavior to change.
    expect(prompt).toContain("fixing that behavior is the point");
    expect(prompt).not.toContain("while preserving runtime behavior");
    // Hiding code from a rule clears many rules, so it's named, not denied.
    expect(prompt).toContain("is not a fix, even if the linter goes quiet");
    expect(prompt).not.toContain("will not clear it");
    expect(prompt).toContain("the minimal change can be no change");
    expect(prompt).toContain("needs changes outside this file");
    expect(prompt).toContain("Don't run the linter or other commands");
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

  test("matches a limit's report when only its count changed", () => {
    const tooLong = diagnostic({
      message:
        "The function `run` has too many lines (88). Maximum allowed is 50.",
      rule: "max-lines-per-function",
    });

    const shorter = diagnostic({
      message:
        "The function `run` has too many lines (55). Maximum allowed is 50.",
      rule: "max-lines-per-function",
    });

    const result = partitionByRemaining([tooLong], [shorter]);

    expect(result.still).toEqual([tooLong]);
    expect(result.stillReported).toEqual([shorter]);
    expect(result.cleared).toEqual([]);
    expect(result.introduced).toEqual([]);
  });

  test.each([
    [
      "@typescript-eslint/max-params",
      "Function 'run' has too many parameters (#). Maximum allowed is 4.",
    ],
    [
      "sonarjs/cognitive-complexity",
      "Refactor this function to reduce its Cognitive Complexity from # to the 15 allowed.",
    ],
    [
      "lint/complexity/noExcessiveCognitiveComplexity",
      "Excessive complexity of # detected (max: 15).",
    ],
  ])("matches a %s report when only its count changed", (rule, message) => {
    const before = diagnostic({ message: message.replace("#", "22"), rule });
    const after = diagnostic({ message: message.replace("#", "18"), rule });

    const result = partitionByRemaining([before], [after]);

    expect(result.still).toEqual([before]);
    expect(result.introduced).toEqual([]);
  });

  test("keeps the numbers in the message of a rule that isn't a limit", () => {
    const fixed = diagnostic({
      message: "No magic number: 42.",
      rule: "no-magic-numbers",
    });

    const added = diagnostic({
      line: 30,
      message: "No magic number: 100.",
      rule: "no-magic-numbers",
    });

    const result = partitionByRemaining([fixed], [added]);

    expect(result.cleared).toEqual([fixed]);
    expect(result.still).toEqual([]);
    expect(result.introduced).toEqual([added]);
  });

  test.each([
    [
      "no-shadow",
      "'x' is already declared in the upper scope on line # column 7.",
    ],
    [
      "sonarjs/no-identical-functions",
      "Update this function so that its implementation is not identical to the one on line #.",
    ],
    [
      "sonarjs/no-duplicate-string",
      "Define a constant instead of duplicating this literal # times.",
    ],
  ])(
    "matches a %s report when only the line it points at or its count changed",
    (rule, message) => {
      const before = diagnostic({ message: message.replace("#", "3"), rule });
      const after = diagnostic({ message: message.replace("#", "4"), rule });

      const result = partitionByRemaining([before], [after]);

      expect(result.still).toEqual([before]);
      expect(result.introduced).toEqual([]);
    }
  );

  test("keeps numbers inside names when matching messages", () => {
    const original = diagnostic({ message: "'value1' is never used." });
    const other = diagnostic({ message: "'value2' is never used." });

    const result = partitionByRemaining([original], [other]);

    expect(result.cleared).toEqual([original]);
    expect(result.introduced).toEqual([other]);
  });

  test("pairs identical messages by the line they were reported on", () => {
    const any = { message: "Unexpected any.", rule: "no-explicit-any" };
    const original = diagnostic({ ...any, line: 2 });

    mockFileSystem({
      "src/foo.ts": "const a = 1;\nconst cache = new Map<any, any>();\n",
    });

    recordSourceLines([original]);

    // The edit adds an `any` above the original, which moves down a line.
    const added = diagnostic({ ...any, line: 1 });
    const moved = diagnostic({ ...any, line: 3 });

    mockFileSystem({
      "src/foo.ts":
        "const helper = (value: any) => value;\nconst a = 1;\n  const cache = new Map<any, any>();\n",
    });

    recordSourceLines([added, moved]);
    restoreFileSystemMock();

    const result = partitionByRemaining([original], [added, moved]);

    expect(result.still).toEqual([original]);
    expect(result.stillReported).toEqual([moved]);
    expect(result.introduced).toEqual([added]);
  });

  test("pairs a report on a rewritten line with the original that was there", () => {
    const any = { message: "Unexpected any.", rule: "no-explicit-any" };
    const first = diagnostic({ ...any, line: 1 });
    const second = diagnostic({ ...any, line: 2 });

    mockFileSystem({ "src/foo.ts": "let a: any;\nlet b: any;\n" });
    recordSourceLines([first, second]);

    const rewritten = diagnostic({ ...any, line: 1 });
    const kept = diagnostic({ ...any, line: 2 });

    mockFileSystem({ "src/foo.ts": "let renamed: any;\nlet b: any;\n" });
    recordSourceLines([rewritten, kept]);
    restoreFileSystemMock();

    const result = partitionByRemaining([first, second], [rewritten, kept]);

    expect(result.still).toEqual([first, second]);
    expect(result.introduced).toEqual([]);
    expect(result.cleared).toEqual([]);
  });

  test("keeps a report the edit added elsewhere new when it fixed the original", () => {
    const any = { message: "Unexpected any.", rule: "no-explicit-any" };
    const original = diagnostic({ ...any, line: 1 });

    mockFileSystem({
      "src/foo.ts": "let a: any;\nlet b = 1;\nexport { a, b };\n",
    });
    recordSourceLines([original]);

    // The edit types `a`, and adds an `any` further down.
    const added = diagnostic({ ...any, line: 3 });

    mockFileSystem({
      "src/foo.ts":
        "let a: string;\nlet b = 1;\nconst f = (v: any) => v;\nexport { a, b, f };\n",
    });
    recordSourceLines([added]);
    restoreFileSystemMock();

    const result = partitionByRemaining([original], [added]);

    expect(result.cleared).toEqual([original]);
    expect(result.still).toEqual([]);
    expect(result.introduced).toEqual([added]);
  });

  test("pairs a rewritten line's report wherever the edit moved it", () => {
    const any = { message: "Unexpected any.", rule: "no-explicit-any" };
    const original = diagnostic({ ...any, line: 3 });

    mockFileSystem({
      "src/foo.ts":
        "import { a } from './a';\n\nconst parse = (raw: any) => a(raw);\n\nexport { parse };\n",
    });
    recordSourceLines([original]);

    // Two lines added above, and the flagged line rewritten in place.
    const rewritten = diagnostic({ ...any, line: 5 });

    mockFileSystem({
      "src/foo.ts":
        "import { a } from './a';\nimport { b } from './b';\n\nconst LIMIT = 3;\nconst parse = (input: any) => b(a(input), LIMIT);\n\nexport { parse };\n",
    });
    recordSourceLines([rewritten]);
    restoreFileSystemMock();

    const result = partitionByRemaining([original], [rewritten]);

    expect(result.still).toEqual([original]);
    expect(result.stillReported).toEqual([rewritten]);
    expect(result.introduced).toEqual([]);
  });

  test("pairs a report whose code the edit moved elsewhere", () => {
    const any = { message: "Unexpected any.", rule: "no-explicit-any" };
    const original = diagnostic({ ...any, line: 3 });

    mockFileSystem({
      "src/foo.ts":
        "import { a } from './a';\n\nconst parse = (raw: any) => a(raw);\n\nexport const run = () => 1;\n\nexport { parse };\n",
    });
    recordSourceLines([original]);

    // `parse` moved below `run`, and its flagged line was rewritten.
    const moved = diagnostic({ ...any, line: 5 });

    mockFileSystem({
      "src/foo.ts":
        "import { a } from './a';\n\nexport const run = () => 1;\n\nconst parse = (input: any) => a(input);\n\nexport { parse };\n",
    });
    recordSourceLines([moved]);
    restoreFileSystemMock();

    const result = partitionByRemaining([original], [moved]);

    expect(result.still).toEqual([original]);
    expect(result.stillReported).toEqual([moved]);
    expect(result.introduced).toEqual([]);
  });

  test("matches a limit rule reported where a count runs out, not on its code", () => {
    const limit = { rule: "max-lines" };

    const original = diagnostic({
      ...limit,
      line: 4,
      message: "File has too many lines (6). Maximum allowed is 3.",
    });

    mockFileSystem({
      "src/foo.ts": "b1();\nb2();\nb3();\nb4();\nb5();\nb6();",
    });
    recordSourceLines([original]);

    // One line removed: the report stays on line 4, which now reads `b5();`.
    const shorter = diagnostic({
      ...limit,
      line: 4,
      message: "File has too many lines (5). Maximum allowed is 3.",
    });

    mockFileSystem({ "src/foo.ts": "b2();\nb3();\nb4();\nb5();\nb6();" });
    recordSourceLines([shorter]);
    restoreFileSystemMock();

    const result = partitionByRemaining([original], [shorter]);

    expect(result.still).toEqual([original]);
    expect(result.introduced).toEqual([]);
  });

  test("matches in file order once a file's snapshots are released", () => {
    const any = { message: "Unexpected any.", rule: "no-explicit-any" };
    const original = diagnostic({ ...any, line: 1 });

    mockFileSystem({ "src/foo.ts": "let a: any;\nlet b = 1;\n" });
    recordSourceLines([original]);

    const added = diagnostic({ ...any, line: 3 });

    mockFileSystem({
      "src/foo.ts": "let a: string;\nlet b = 1;\nconst f = (v: any) => v;\n",
    });
    recordSourceLines([added]);
    restoreFileSystemMock();
    releaseSourceLines("src/foo.ts");

    const result = partitionByRemaining([original], [added]);

    expect(result.still).toEqual([original]);
    expect(result.introduced).toEqual([]);
  });
});
