import { afterEach, describe, expect, mock, test } from "bun:test";

import { getLinterAdapter } from "../src/agent-fix/linters";

const oxlintJson = JSON.stringify({
  diagnostics: [
    {
      code: "eslint(no-eval)",
      filename: "src/bad.ts",
      help: "Avoid eval().",
      labels: [{ span: { column: 13, length: 4, line: 4, offset: 103 } }],
      message: "eval can be harmful.",
      severity: "error",
      url: "https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-eval.html",
    },
  ],
  number_of_files: 1,
});

const biomeJson = JSON.stringify({
  command: "check",
  diagnostics: [
    {
      category: "lint/security/noGlobalEval",
      location: {
        end: { column: 17, line: 4 },
        path: "src/bad.ts",
        start: { column: 13, line: 4 },
      },
      message: "eval() exposes to security risks and performance issues.",
      severity: "error",
    },
  ],
  summary: { errors: 1 },
});

const eslintJson = JSON.stringify({
  metadata: {
    rulesMeta: {
      "no-eval": {
        docs: {
          description: "Disallow the use of `eval()`",
          url: "https://eslint.org/docs/latest/rules/no-eval",
        },
      },
    },
  },
  results: [
    {
      filePath: "/project/src/bad.ts",
      messages: [
        {
          column: 13,
          line: 4,
          message: "eval can be harmful.",
          ruleId: "no-eval",
          severity: 2,
        },
        {
          column: 1,
          fatal: true,
          line: 9,
          message: "Parsing error: Unexpected token",
          ruleId: null,
          severity: 2,
        },
      ],
    },
  ],
});

const biomeExplainOutput = `Summary

- Name: noGlobalEval
- Diagnostic category: lint/security/noGlobalEval

Description

 Disallow the use of global \`eval()\`.

 The \`eval()\` function evaluates the passed string as a _JavaScript_ code.

Examples

Invalid
`;

describe("agent-fix linter adapters", () => {
  afterEach(() => {
    mock.restore();
  });

  test("oxlint adapter runs oxlint --fix, oxfmt, then a report-only oxlint pass and parses its diagnostics", () => {
    const mockSpawn = mock((cmd: string, _args: string[]) => ({
      status: cmd === "oxlint" ? 1 : 0,
      stdout: cmd === "oxlint" ? oxlintJson : "",
    }));

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    const diagnostics = getLinterAdapter("oxlint").fixAndCollect([], []);

    const [fixCall, oxfmtCall, collectCall] = mockSpawn.mock.calls;
    expect(fixCall[0]).toBe("oxlint");
    expect(fixCall[1]).toEqual(["--fix", "."]);
    expect(oxfmtCall[0]).toBe("oxfmt");
    expect(oxfmtCall[1]).toEqual(["--write", "."]);
    expect(collectCall[0]).toBe("oxlint");
    expect(collectCall[1]).toEqual(["-f", "json", "."]);

    expect(diagnostics).toEqual([
      {
        column: 13,
        fatal: false,
        file: "src/bad.ts",
        help: "Avoid eval().",
        line: 4,
        message: "eval can be harmful.",
        raw: expect.objectContaining({ code: "eslint(no-eval)" }),
        rule: "no-eval",
        severity: "error",
        url: "https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-eval.html",
      },
    ]);
  });

  test("oxlint adapter names plugin rules as the config does and flags parse errors", () => {
    const stdout = JSON.stringify({
      diagnostics: [
        {
          code: "typescript(no-explicit-any)",
          filename: "src/a.ts",
          message: "Unexpected any.",
        },
        {
          code: "react-doctor(no-barrel-import)",
          filename: "src/a.ts",
          message: "Import directly.",
        },
        { filename: "src/a.ts", message: "Unexpected token" },
        {
          filename: "src/a.ts",
          message:
            "Unused oxlint-disable directive (no problems were reported).",
        },
      ],
    });

    const mockSpawn = mock((cmd: string) => ({
      status: 1,
      stdout: cmd === "oxlint" ? stdout : "",
    }));

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    const diagnostics = getLinterAdapter("oxlint").fixAndCollect([], []);

    expect(diagnostics.map(({ fatal, rule }) => ({ fatal, rule }))).toEqual([
      { fatal: false, rule: "typescript/no-explicit-any" },
      { fatal: false, rule: "react-doctor/no-barrel-import" },
      { fatal: true, rule: "oxlint" },
      { fatal: false, rule: "oxlint" },
    ]);
  });

  test("oxlint adapter maps --unsafe to --fix-dangerously", () => {
    const mockSpawn = mock((cmd: string, _args: string[]) => ({
      status: 0,
      stdout: cmd === "oxlint" ? '{"diagnostics":[]}' : "",
    }));

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    getLinterAdapter("oxlint").fixAndCollect(
      ["src/a.ts"],
      ["--unsafe", "--type-aware"]
    );

    const [fixCall, , collectCall] = mockSpawn.mock.calls;
    expect(fixCall[1]).toContain("--fix-dangerously");
    expect(fixCall[1]).not.toContain("--unsafe");
    expect(fixCall[1]).toContain("--type-aware");
    expect(fixCall[1]).toContain("src/a.ts");
    expect(collectCall[1]).toEqual(["--type-aware", "-f", "json", "src/a.ts"]);
  });

  test("oxlint adapter verify targets the single file", () => {
    const mockSpawn = mock((cmd: string, _args: string[]) => ({
      status: 0,
      stdout: cmd === "oxlint" ? '{"diagnostics":[]}' : "",
    }));

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    getLinterAdapter("oxlint").verify("src/a.ts", []);

    const [fixCall, oxfmtCall, collectCall] = mockSpawn.mock.calls;
    expect(fixCall[1]).toEqual(["--fix", "src/a.ts"]);
    expect(oxfmtCall[1]).toEqual(["--write", "src/a.ts"]);
    expect(collectCall[1]).toEqual(["-f", "json", "src/a.ts"]);
  });

  test("oxlint adapter throws on spawn failure", () => {
    const mockSpawn = mock(() => ({ error: new Error("spawn failed") }));
    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    expect(() => getLinterAdapter("oxlint").fixAndCollect([], [])).toThrow(
      "Failed to run oxlint: spawn failed"
    );
  });

  test("oxlint adapter throws on malformed JSON output", () => {
    const mockSpawn = mock((cmd: string) => ({
      status: 0,
      stdout: cmd === "oxlint" ? "not json" : "",
    }));

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    expect(() => getLinterAdapter("oxlint").fixAndCollect([], [])).toThrow(
      "Failed to parse JSON output from oxlint"
    );
  });

  test("biome adapter runs check --write with the JSON reporter and parses diagnostics", () => {
    const mockSpawn = mock((_cmd: string, args: string[]) =>
      args[0] === "explain"
        ? { status: 0, stdout: biomeExplainOutput }
        : { status: 1, stdout: biomeJson }
    );

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    const diagnostics = getLinterAdapter("biome").fixAndCollect([], []);

    const [biomeCall, explainCall] = mockSpawn.mock.calls;
    expect(biomeCall[0]).toBe("biome");
    expect(biomeCall[1]).toEqual([
      "check",
      "--write",
      "--no-errors-on-unmatched",
      "--reporter=json",
      "./",
    ]);
    // Biome's JSON reporter carries no help text, so the rule's
    // documentation stands in for it.
    expect(explainCall[1]).toEqual(["explain", "noGlobalEval"]);

    expect(diagnostics).toEqual([
      {
        column: 13,
        fatal: false,
        file: "src/bad.ts",
        help: "Disallow the use of global `eval()`.\n\nThe `eval()` function evaluates the passed string as a _JavaScript_ code.",
        line: 4,
        message: "eval() exposes to security risks and performance issues.",
        raw: expect.objectContaining({
          category: "lint/security/noGlobalEval",
        }),
        rule: "lint/security/noGlobalEval",
        severity: "error",
        url: "https://biomejs.dev/linter/rules/no-global-eval",
      },
    ]);
  });

  test("biome adapter flags parse errors and goes without help Biome can't explain", () => {
    const stdout = JSON.stringify({
      diagnostics: [
        {
          category: "parse",
          location: { path: "src/a.ts" },
          message: "Expected an expression.",
        },
        {
          category: "lint/nursery/noUnknownRuleForTest",
          location: { path: "src/a.ts" },
          message: "message",
        },
      ],
    });

    const mockSpawn = mock((_cmd: string, args: string[]) =>
      args[0] === "explain" ? { status: 1, stdout: "" } : { status: 1, stdout }
    );

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    const [parseError, lint] = getLinterAdapter("biome").fixAndCollect([], []);

    expect(parseError).toMatchObject({ fatal: true, rule: "parse" });
    expect(parseError.url).toBeUndefined();
    expect(lint).toMatchObject({
      fatal: false,
      url: "https://biomejs.dev/linter/rules/no-unknown-rule-for-test",
    });
    expect(lint.help).toBeUndefined();
  });

  test("biome adapter reads path from an object location shape", () => {
    const objectPathJson = JSON.stringify({
      diagnostics: [
        {
          category: "lint/a/b",
          location: { path: { file: "src/other.ts" } },
          message: "message",
          severity: "warning",
        },
      ],
    });

    const mockSpawn = mock(() => ({ status: 0, stdout: objectPathJson }));
    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    const [diagnostic] = getLinterAdapter("biome").fixAndCollect([], []);
    expect(diagnostic.file).toBe("src/other.ts");
    expect(diagnostic.line).toBe(1);
    expect(diagnostic.column).toBe(1);
  });

  test("eslint adapter runs eslint --fix, stylelint, prettier, then a report-only eslint pass", () => {
    const mockSpawn = mock((cmd: string, _args: string[]) => ({
      status: 0,
      stdout: cmd === "eslint" ? eslintJson : "",
    }));

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    const diagnostics = getLinterAdapter("eslint").fixAndCollect([], []);

    const commands = mockSpawn.mock.calls.map((call) => call[0]);
    expect(commands).toEqual(["eslint", "stylelint", "prettier", "eslint"]);

    const [fixCall] = mockSpawn.mock.calls;
    const collectCall = mockSpawn.mock.calls.at(-1);
    expect(fixCall[1]).toEqual(["--fix", "."]);
    expect(collectCall?.[1]).toEqual(["-f", "json-with-metadata", "."]);

    expect(diagnostics).toEqual([
      {
        column: 13,
        fatal: false,
        file: "/project/src/bad.ts",
        help: "Disallow the use of `eval()`",
        line: 4,
        message: "eval can be harmful.",
        raw: expect.objectContaining({ ruleId: "no-eval" }),
        rule: "no-eval",
        severity: "error",
        url: "https://eslint.org/docs/latest/rules/no-eval",
      },
      {
        column: 1,
        fatal: true,
        file: "/project/src/bad.ts",
        help: undefined,
        line: 9,
        message: "Parsing error: Unexpected token",
        raw: expect.objectContaining({ fatal: true }),
        rule: "eslint",
        severity: "error",
        url: undefined,
      },
    ]);
  });

  test("eslint adapter verify skips stylelint for non-style files", () => {
    const mockSpawn = mock((cmd: string) => ({
      status: 0,
      stdout: cmd === "eslint" ? "[]" : "",
    }));

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    getLinterAdapter("eslint").verify("src/a.ts", []);

    const commands = mockSpawn.mock.calls.map((call) => call[0]);
    expect(commands).toEqual(["eslint", "prettier", "eslint"]);
  });

  test("eslint adapter skips Stylelint when it isn't installed", () => {
    const mockSpawn = mock((cmd: string) =>
      cmd === "stylelint"
        ? {
            error: new Error("Command failed with ENOENT: stylelint"),
            errorCode: "ENOENT",
            status: null,
          }
        : { status: 0, stdout: cmd === "eslint" ? "[]" : "" }
    );

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    expect(getLinterAdapter("eslint").fixAndCollect([], [])).toEqual([]);

    const commands = mockSpawn.mock.calls.map((call) => call[0]);
    expect(commands).toEqual(["eslint", "stylelint", "prettier", "eslint"]);
  });

  test("eslint adapter still fails when a required tool isn't installed", () => {
    const mockSpawn = mock((cmd: string) =>
      cmd === "prettier"
        ? {
            error: new Error("Command failed with ENOENT: prettier"),
            errorCode: "ENOENT",
            status: null,
          }
        : { status: 0, stdout: cmd === "eslint" ? "[]" : "" }
    );

    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    expect(() => getLinterAdapter("eslint").fixAndCollect([], [])).toThrow(
      "Failed to run prettier"
    );
  });
});
