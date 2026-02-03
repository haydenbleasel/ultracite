import { afterEach, describe, expect, mock, test } from "bun:test";
import { fix } from "../src/commands/fix";
import { parseFilePaths } from "../src/utils";

describe("fix", () => {
  afterEach(() => {
    mock.restore();
  });

  test("runs biome check with --write flag", async () => {
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

    await fix([]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("npx @biomejs/biome check");
    expect(callArgs[0]).toContain("--write");
    expect(callArgs[0]).toContain("--no-errors-on-unmatched");
    expect(callArgs[0]).toContain("./");
  });

  test("runs biome fix with specific files", async () => {
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

    await fix(["src/index.ts", "src/test.ts"]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("src/index.ts");
    expect(callArgs[0]).toContain("src/test.ts");
  });

  test("passes through --unsafe option to biome", async () => {
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

    await fix([], ["--unsafe"]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("--unsafe");
  });

  test("does not include --unsafe when passthrough is empty", async () => {
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

    await fix([], []);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).not.toContain("--unsafe");
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

    await fix(["src/my file.ts"]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    // The real parseFilePaths adds a trailing space
    expect(callArgs[0]).toContain("'src/my file.ts' ");
  });

  test("exits with status code when biome fix finds errors", async () => {
    const mockSpawn = mock(() => ({ status: 1 }));
    const mockExit = mock(() => {});

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
    process.exit = mockExit as never;

    await fix([]);
    expect(mockExit).toHaveBeenCalledWith(1);
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

    await expect(fix([])).rejects.toThrow("Failed to run Biome: spawn failed");
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

    await expect(fix([])).rejects.toThrow("No linter configuration found");
  });

  test("runs eslint fix when linter is eslint (runs prettier, eslint, stylelint)", async () => {
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

    await fix([]);

    expect(mockSpawn).toHaveBeenCalledTimes(3);
    const prettierCall = mockSpawn.mock.calls[0];
    const eslintCall = mockSpawn.mock.calls[1];
    const stylelintCall = mockSpawn.mock.calls[2];
    expect(prettierCall[0]).toContain("npx prettier");
    expect(prettierCall[0]).toContain("--write");
    expect(eslintCall[0]).toContain("npx eslint");
    expect(eslintCall[0]).toContain("--fix");
    expect(stylelintCall[0]).toContain("npx stylelint");
    expect(stylelintCall[0]).toContain("--fix");
  });

  test("runs eslint fix with specific files", async () => {
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

    await fix(["src/index.ts"]);

    expect(mockSpawn).toHaveBeenCalledTimes(3);
    const eslintCall = mockSpawn.mock.calls[1];
    expect(eslintCall[0]).toContain("src/index.ts");
  });

  test("eslint fix exits with status code when prettier fails", async () => {
    const mockSpawn = mock(() => ({ status: 1 }));
    const mockExit = mock(() => {});

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
    process.exit = mockExit as never;

    await fix([]);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test("eslint fix throws on prettier spawn error", async () => {
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

    await expect(fix([])).rejects.toThrow(
      "Failed to run Prettier: prettier spawn failed"
    );
  });

  test("eslint fix throws on eslint spawn error", async () => {
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

    await expect(fix([])).rejects.toThrow(
      "Failed to run ESLint: eslint spawn failed"
    );
  });

  test("eslint fix throws on stylelint spawn error", async () => {
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

    await expect(fix([])).rejects.toThrow(
      "Failed to run Stylelint: stylelint spawn failed"
    );
  });

  test("runs oxlint fix when linter is oxlint (runs oxfmt, oxlint)", async () => {
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

    await fix([]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxfmtCall = mockSpawn.mock.calls[0];
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxfmtCall[0]).toContain("npx oxfmt");
    expect(oxfmtCall[0]).toContain("--write");
    expect(oxlintCall[0]).toContain("npx oxlint");
    expect(oxlintCall[0]).toContain("--fix");
  });

  test("runs oxlint fix with specific files", async () => {
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

    await fix(["src/index.ts"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[0]).toContain("src/index.ts");
  });

  test("oxlint fix throws on spawn error", async () => {
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

    await expect(fix([])).rejects.toThrow(
      "Failed to run oxfmt: oxfmt spawn failed"
    );
  });

  test("oxlint fix exits with status code on failure", async () => {
    const mockSpawn = mock(() => ({ status: 1 }));
    const mockExit = mock(() => {});

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
    process.exit = mockExit as never;

    await fix([]);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test("passes through --type-aware flag to oxlint", async () => {
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

    await fix([], ["--type-aware"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[0]).toContain("--type-aware");
  });

  test("passes through --type-check flag to oxlint", async () => {
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

    await fix([], ["--type-check"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[0]).toContain("--type-check");
  });

  test("passes through multiple flags to oxlint", async () => {
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

    await fix([], ["--type-aware", "--type-check"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[0]).toContain("--type-aware");
    expect(oxlintCall[0]).toContain("--type-check");
  });

  test("does not include flags when passthrough is empty", async () => {
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

    await fix([], []);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[0]).not.toContain("--type-aware");
    expect(oxlintCall[0]).not.toContain("--type-check");
  });

  test("converts --unsafe to --fix-dangerously for oxlint", async () => {
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

    await fix([], ["--unsafe"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[0]).toContain("--fix-dangerously");
    expect(oxlintCall[0]).not.toContain("--unsafe");
  });
});
