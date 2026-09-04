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

const eslintJson = JSON.stringify([
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
    ],
  },
]);

describe("agent-fix linter adapters", () => {
  afterEach(() => {
    mock.restore();
  });

  test("oxlint adapter runs oxlint --fix with JSON output then oxfmt and parses diagnostics", () => {
    const mockSpawn = mock((cmd: string, _args: string[]) => ({
      status: cmd === "oxlint" ? 1 : 0,
      stdout: cmd === "oxlint" ? oxlintJson : "",
    }));
    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    const diagnostics = getLinterAdapter("oxlint").fixAndCollect([], []);

    const [oxlintCall, oxfmtCall] = mockSpawn.mock.calls;
    expect(oxlintCall[0]).toBe("oxlint");
    expect(oxlintCall[1]).toEqual(["--fix", "-f", "json", "."]);
    expect(oxfmtCall[0]).toBe("oxfmt");
    expect(oxfmtCall[1]).toEqual(["--write", "."]);

    expect(diagnostics).toEqual([
      {
        column: 13,
        file: "src/bad.ts",
        help: "Avoid eval().",
        line: 4,
        message: "eval can be harmful.",
        raw: expect.objectContaining({ code: "eslint(no-eval)" }),
        rule: "eslint(no-eval)",
        severity: "error",
        url: "https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-eval.html",
      },
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

    const [oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toContain("--fix-dangerously");
    expect(oxlintCall[1]).not.toContain("--unsafe");
    expect(oxlintCall[1]).toContain("--type-aware");
    expect(oxlintCall[1]).toContain("src/a.ts");
  });

  test("oxlint adapter verify targets the single file", () => {
    const mockSpawn = mock((cmd: string, _args: string[]) => ({
      status: 0,
      stdout: cmd === "oxlint" ? '{"diagnostics":[]}' : "",
    }));
    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    getLinterAdapter("oxlint").verify("src/a.ts", []);

    const [oxlintCall, oxfmtCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toEqual(["--fix", "-f", "json", "src/a.ts"]);
    expect(oxfmtCall[1]).toEqual(["--write", "src/a.ts"]);
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
    const mockSpawn = mock((_cmd: string, _args: string[]) => ({
      status: 1,
      stdout: biomeJson,
    }));
    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    const diagnostics = getLinterAdapter("biome").fixAndCollect([], []);

    const [biomeCall] = mockSpawn.mock.calls;
    expect(biomeCall[0]).toBe("biome");
    expect(biomeCall[1]).toEqual([
      "check",
      "--write",
      "--no-errors-on-unmatched",
      "--reporter=json",
      "./",
    ]);

    expect(diagnostics).toEqual([
      {
        column: 13,
        file: "src/bad.ts",
        line: 4,
        message: "eval() exposes to security risks and performance issues.",
        raw: expect.objectContaining({
          category: "lint/security/noGlobalEval",
        }),
        rule: "lint/security/noGlobalEval",
        severity: "error",
      },
    ]);
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

  test("eslint adapter runs eslint --fix with JSON, stylelint autofix, then prettier", () => {
    const mockSpawn = mock((cmd: string, _args: string[]) => ({
      status: 0,
      stdout: cmd === "eslint" ? eslintJson : "",
    }));
    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

    const diagnostics = getLinterAdapter("eslint").fixAndCollect([], []);

    const commands = mockSpawn.mock.calls.map((call) => call[0]);
    expect(commands).toEqual(["eslint", "stylelint", "prettier"]);

    const [eslintCall] = mockSpawn.mock.calls;
    expect(eslintCall[1]).toEqual(["--fix", "-f", "json", "."]);

    expect(diagnostics).toEqual([
      {
        column: 13,
        file: "/project/src/bad.ts",
        line: 4,
        message: "eval can be harmful.",
        raw: expect.objectContaining({ ruleId: "no-eval" }),
        rule: "no-eval",
        severity: "error",
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
    expect(commands).toEqual(["eslint", "prettier"]);
  });
});
