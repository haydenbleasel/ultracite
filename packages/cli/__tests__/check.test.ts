import { afterEach, describe, expect, mock, test } from "bun:test";
import { check } from "../src/commands/check";
import { parseFilePaths } from "../src/utils";

describe("check", () => {
  afterEach(() => {
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
      parseFilePaths,
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
      parseFilePaths,
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
      parseFilePaths,
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
      parseFilePaths,
    }));

    await check([["src/my file.ts"], {}]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    // The real parseFilePaths adds a trailing space
    expect(callArgs[0]).toContain("'src/my file.ts' ");
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
      parseFilePaths,
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
      parseFilePaths,
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
      parseFilePaths,
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
      parseFilePaths,
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
      parseFilePaths,
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
      parseFilePaths,
    }));

    await expect(check([[], { linter: "eslint" }])).rejects.toThrow(
      "Failed to run Prettier: prettier spawn failed"
    );
  });

  test("eslint check throws on eslint spawn error", async () => {
    let callCount = 0;
    const mockSpawn = mock(() => {
      callCount++;
      if (callCount === 1) {
        return { status: 0 }; // prettier succeeds
      }
      return {
        error: new Error("eslint spawn failed"),
        status: null,
      };
    });

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
      parseFilePaths,
    }));

    await expect(check([[], { linter: "eslint" }])).rejects.toThrow(
      "Failed to run ESLint: eslint spawn failed"
    );
  });

  test("eslint check throws on stylelint spawn error", async () => {
    let callCount = 0;
    const mockSpawn = mock(() => {
      callCount++;
      if (callCount <= 2) {
        return { status: 0 }; // prettier and eslint succeed
      }
      return {
        error: new Error("stylelint spawn failed"),
        status: null,
      };
    });

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
      parseFilePaths,
    }));

    await expect(check([[], { linter: "eslint" }])).rejects.toThrow(
      "Failed to run Stylelint: stylelint spawn failed"
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
      parseFilePaths,
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
      parseFilePaths,
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
      parseFilePaths,
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
      parseFilePaths,
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
      parseFilePaths,
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
      parseFilePaths,
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
      parseFilePaths,
    }));

    await check(undefined);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    expect(mockSpawn.mock.calls[0][0]).toContain("oxfmt");
    expect(mockSpawn.mock.calls[1][0]).toContain("oxlint");
  });

  test("runs oxlint check with --type-aware flag", async () => {
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
      parseFilePaths,
    }));

    await check([[], { linter: "oxlint", "type-aware": true }]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[0]).toContain("--type-aware");
  });

  test("runs oxlint check with --type-check flag", async () => {
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
      parseFilePaths,
    }));

    await check([[], { linter: "oxlint", "type-check": true }]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[0]).toContain("--type-check");
  });

  test("runs oxlint check with both --type-aware and --type-check flags", async () => {
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
      parseFilePaths,
    }));

    await check([
      [],
      { linter: "oxlint", "type-aware": true, "type-check": true },
    ]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[0]).toContain("--type-aware");
    expect(oxlintCall[0]).toContain("--type-check");
  });

  test("does not include type flags when options are false", async () => {
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
      parseFilePaths,
    }));

    await check([
      [],
      { linter: "oxlint", "type-aware": false, "type-check": false },
    ]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[0]).not.toContain("--type-aware");
    expect(oxlintCall[0]).not.toContain("--type-check");
  });
});
