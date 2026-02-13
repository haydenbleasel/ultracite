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
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths,
    }));

    await check();

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toBe("biome");
    expect(callArgs[1]).toContain("check");
    expect(callArgs[1]).toContain("--no-errors-on-unmatched");
    expect(callArgs[1]).toContain("./");
  });

  test("runs biome check with specific files", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths,
    }));

    await check(["src/index.ts", "src/test.ts"]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[1]).toContain("src/index.ts");
    expect(callArgs[1]).toContain("src/test.ts");
  });

  test("passes through unknown options to biome", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths,
    }));

    await check([], ["--diagnostic-level=error", "--error-on-warnings"]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[1]).toContain("--diagnostic-level=error");
    expect(callArgs[1]).toContain("--error-on-warnings");
  });

  test("handles files with special characters", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths,
    }));

    await check(["src/my file.ts"]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[1]).toContain("'src/my file.ts' ");
  });

  test("exits with status code when biome check finds errors", async () => {
    const mockSpawn = mock(() => ({ status: 1 }));
    const mockExit = mock(() => undefined);

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths,
    }));
    process.exit = mockExit as never;

    await check();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test("exits when spawn returns error", async () => {
    const mockSpawn = mock(() => ({
      error: new Error("spawn failed"),
      status: null,
    }));

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "biome"),
      parseFilePaths,
    }));

    await expect(check()).rejects.toThrow("Failed to run Biome: spawn failed");
  });

  test("throws when no linter configuration found", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => null),
      parseFilePaths,
    }));

    await expect(check()).rejects.toThrow("No linter configuration found");
  });

  test("runs eslint check when linter is eslint (runs prettier, eslint, stylelint)", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "eslint"),
      parseFilePaths,
    }));

    await check();

    expect(mockSpawn).toHaveBeenCalledTimes(3);
    const prettierCall = mockSpawn.mock.calls[0];
    const eslintCall = mockSpawn.mock.calls[1];
    const stylelintCall = mockSpawn.mock.calls[2];
    expect(prettierCall[0]).toBe("prettier");
    expect(prettierCall[1]).toContain("--check");
    expect(eslintCall[0]).toBe("eslint");
    expect(stylelintCall[0]).toBe("stylelint");
  });

  test("runs eslint check with specific files", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "eslint"),
      parseFilePaths,
    }));

    await check(["src/index.ts"]);

    expect(mockSpawn).toHaveBeenCalledTimes(3);
    const eslintCall = mockSpawn.mock.calls[1];
    expect(eslintCall[1]).toContain("src/index.ts");
  });

  test("eslint check throws on spawn error", async () => {
    const mockSpawn = mock(() => ({
      error: new Error("prettier spawn failed"),
      status: null,
    }));

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "eslint"),
      parseFilePaths,
    }));

    await expect(check()).rejects.toThrow(
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
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "eslint"),
      parseFilePaths,
    }));

    await expect(check()).rejects.toThrow(
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
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "eslint"),
      parseFilePaths,
    }));

    await expect(check()).rejects.toThrow(
      "Failed to run Stylelint: stylelint spawn failed"
    );
  });

  test("runs oxlint check when linter is oxlint (runs oxfmt, oxlint)", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths,
    }));

    await check();

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxfmtCall = mockSpawn.mock.calls[0];
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxfmtCall[0]).toBe("oxfmt");
    expect(oxfmtCall[1]).toContain("--check");
    expect(oxlintCall[0]).toBe("oxlint");
  });

  test("runs oxlint check with specific files", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths,
    }));

    await check(["src/index.ts"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[1]).toContain("src/index.ts");
  });

  test("oxlint check throws on spawn error", async () => {
    const mockSpawn = mock(() => ({
      error: new Error("oxfmt spawn failed"),
      status: null,
    }));

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths,
    }));

    await expect(check()).rejects.toThrow(
      "Failed to run oxfmt: oxfmt spawn failed"
    );
  });

  test("eslint check exits with status code on failure", async () => {
    const mockSpawn = mock(() => ({ status: 1 }));
    const mockExit = mock(() => undefined);

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "eslint"),
      parseFilePaths,
    }));
    process.exit = mockExit as never;

    await check();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test("oxlint check exits with status code on failure", async () => {
    const mockSpawn = mock(() => ({ status: 1 }));
    const mockExit = mock(() => undefined);

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths,
    }));
    process.exit = mockExit as never;

    await check();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test("passes through --type-aware flag to oxlint", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths,
    }));

    await check([], ["--type-aware"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[1]).toContain("--type-aware");
  });

  test("passes through --type-check flag to oxlint", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths,
    }));

    await check([], ["--type-check"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[1]).toContain("--type-check");
  });

  test("passes through multiple flags to oxlint", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths,
    }));

    await check([], ["--type-aware", "--type-check"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[1]).toContain("--type-aware");
    expect(oxlintCall[1]).toContain("--type-check");
  });

  test("does not include flags when passthrough is empty", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(async () => "oxlint"),
      parseFilePaths,
    }));

    await check([], []);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const oxlintCall = mockSpawn.mock.calls[1];
    expect(oxlintCall[1]).not.toContain("--type-aware");
    expect(oxlintCall[1]).not.toContain("--type-check");
  });
});
