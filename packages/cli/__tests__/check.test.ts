import { beforeEach, describe, expect, mock, test } from "bun:test";
import { check } from "../src/commands/check";

mock.module("node:child_process", () => ({
  spawnSync: mock(() => ({ status: 0 })),
  execSync: mock(() => ""),
}));

mock.module("nypm", () => ({
  detectPackageManager: mock(async () => ({ name: "npm" })),
  dlxCommand: mock(
    (_pm, pkg, opts) =>
      `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
  ),
}));

mock.module("../src/utils", () => ({
  detectLinter: mock(async () => "biome"),
  parseFilePaths: (files: string[]) =>
    files.map((file) =>
      /[ $(){}[\]&|;<>!"'`*?#~]/.test(file)
        ? `'${file.replace(/'/g, "'\\''")}'`
        : file
    ),
}));

describe("check", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("runs biome check with default options", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths: (files: string[]) => files,
    }));

    await check(undefined);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("npx @biomejs/biome check");
    expect(callArgs[0]).toContain("--no-errors-on-unmatched");
    expect(callArgs[0]).toContain("./");
  });

  test("runs biome check with specific files", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths: (files: string[]) => files,
    }));

    await check([["src/index.ts", "src/test.ts"], {}]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("src/index.ts");
    expect(callArgs[0]).toContain("src/test.ts");
  });

  test("runs biome check with diagnostic-level option", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths: (files: string[]) => files,
    }));

    await check([[], { "diagnostic-level": "error" }]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("--diagnostic-level=error");
  });

  test("handles files with special characters", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths: (files: string[]) =>
        files.map((file) =>
          /[ $(){}[\]&|;<>!"'`*?#~]/.test(file)
            ? `'${file.replace(/'/g, "'\\''")}'`
            : file
        ),
    }));

    await check([["src/my file.ts"], {}]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("'src/my file.ts'");
  });

  test("returns hasErrors true when biome check finds errors", async () => {
    const mockSpawn = mock(() => ({ status: 1 }));

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths: (files: string[]) => files,
    }));

    const result = await check(undefined);
    expect(result.hasErrors).toBe(true);
  });

  test("exits when spawn returns error", async () => {
    const mockSpawn = mock(() => ({
      error: new Error("spawn failed"),
      status: null,
    }));

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths: (files: string[]) => files,
    }));

    await expect(check(undefined)).rejects.toThrow(
      "Failed to run Biome: spawn failed"
    );
  });

  test("throws when no linter configuration found", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => null),
      parseFilePaths: (files: string[]) => files,
    }));

    await expect(check(undefined)).rejects.toThrow(
      "No linter configuration found"
    );
  });

  test("runs eslint check when linter is eslint (runs prettier, eslint, stylelint)", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "eslint"),
      parseFilePaths: (files: string[]) => files,
    }));

    await check([[], { linter: "eslint" }]);

    expect(mockSpawn).toHaveBeenCalledTimes(3);
    const prettierCall = mockSpawn.mock.calls[0];
    const eslintCall = mockSpawn.mock.calls[1];
    const stylelintCall = mockSpawn.mock.calls[2];
    expect(prettierCall[0]).toContain("npx prettier");
    expect(prettierCall[0]).toContain("--check");
    expect(eslintCall[0]).toContain("npx eslint");
    expect(stylelintCall[0]).toContain("npx stylelint");
  });

  test("runs eslint check with specific files", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "eslint"),
      parseFilePaths: (files: string[]) => files,
    }));

    await check([["src/index.ts"], { linter: "eslint" }]);

    expect(mockSpawn).toHaveBeenCalledTimes(3);
    const eslintCall = mockSpawn.mock.calls[1];
    expect(eslintCall[0]).toContain("src/index.ts");
  });

  test("eslint check throws on spawn error", async () => {
    const mockSpawn = mock(() => ({
      error: new Error("prettier spawn failed"),
      status: null,
    }));

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "eslint"),
      parseFilePaths: (files: string[]) => files,
    }));

    await expect(check([[], { linter: "eslint" }])).rejects.toThrow(
      "Failed to run Prettier: prettier spawn failed"
    );
  });

  test("runs oxlint check when linter is oxlint (runs oxfmt, oxlint)", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths: (files: string[]) => files,
    }));

    await check([[], { linter: "oxlint" }]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxfmtCall = mockSpawn.mock.calls[0];
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxfmtCall[0]).toContain("npx oxfmt");
    expect(oxfmtCall[0]).toContain("--check");
    expect(oxlintCall[0]).toContain("npx oxlint");
  });

  test("runs oxlint check with specific files", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths: (files: string[]) => files,
    }));

    await check([["src/index.ts"], { linter: "oxlint" }]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[0]).toContain("src/index.ts");
  });

  test("oxlint check throws on spawn error", async () => {
    const mockSpawn = mock(() => ({
      error: new Error("oxfmt spawn failed"),
      status: null,
    }));

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths: (files: string[]) => files,
    }));

    await expect(check([[], { linter: "oxlint" }])).rejects.toThrow(
      "Failed to run oxfmt: oxfmt spawn failed"
    );
  });

  test("eslint check returns hasErrors true on failure", async () => {
    const mockSpawn = mock(() => ({ status: 1 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "eslint"),
      parseFilePaths: (files: string[]) => files,
    }));

    const result = await check([[], { linter: "eslint" }]);
    expect(result.hasErrors).toBe(true);
  });

  test("oxlint check returns hasErrors true on failure", async () => {
    const mockSpawn = mock(() => ({ status: 1 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths: (files: string[]) => files,
    }));

    const result = await check([[], { linter: "oxlint" }]);
    expect(result.hasErrors).toBe(true);
  });

  test("auto-detects eslint when eslint config exists", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "eslint"),
      parseFilePaths: (files: string[]) => files,
    }));

    await check(undefined);

    expect(mockSpawn).toHaveBeenCalledTimes(3);
    expect(mockSpawn.mock.calls[0][0]).toContain("prettier");
    expect(mockSpawn.mock.calls[1][0]).toContain("eslint");
    expect(mockSpawn.mock.calls[2][0]).toContain("stylelint");
  });

  test("auto-detects oxlint when oxlint config exists", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths: (files: string[]) => files,
    }));

    await check(undefined);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    expect(mockSpawn.mock.calls[0][0]).toContain("oxfmt");
    expect(mockSpawn.mock.calls[1][0]).toContain("oxlint");
  });
});
