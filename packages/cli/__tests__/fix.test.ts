import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fix } from "../src/commands/fix";

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

describe("fix", () => {
  beforeEach(() => {
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

    await fix([], {});

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

    await fix(["src/index.ts", "src/test.ts"], {});

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("src/index.ts");
    expect(callArgs[0]).toContain("src/test.ts");
  });

  test("runs biome fix with unsafe option", async () => {
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

    await fix([], { unsafe: true });

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("--unsafe");
  });

  test("does not include --unsafe when option is false", async () => {
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

    await fix([], { unsafe: false });

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

    await fix(["src/my file.ts"], {});

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("'src/my file.ts'");
  });

  test("returns hasErrors true when biome fix finds errors", async () => {
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

    const result = await fix([], {});
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

    await expect(fix([], {})).rejects.toThrow(
      "Failed to run Ultracite: spawn failed"
    );
  });

  test("runs eslint fix when linter is eslint (runs prettier then eslint)", async () => {
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

    await fix([], { linter: "eslint" });

    // Should call spawnSync twice: once for prettier, once for eslint
    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const prettierCall = mockSpawn.mock.calls[0];
    const eslintCall = mockSpawn.mock.calls[1];
    expect(prettierCall[0]).toContain("npx prettier");
    expect(prettierCall[0]).toContain("--write");
    expect(eslintCall[0]).toContain("npx eslint");
    expect(eslintCall[0]).toContain("--fix");
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

    await fix(["src/index.ts"], { linter: "eslint" });

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const eslintCall = mockSpawn.mock.calls[1];
    expect(eslintCall[0]).toContain("src/index.ts");
  });

  test("eslint fix returns hasErrors true when prettier fails", async () => {
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

    const result = await fix([], { linter: "eslint" });
    expect(result.hasErrors).toBe(true);
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

    await expect(fix([], { linter: "eslint" })).rejects.toThrow(
      "Failed to run Ultracite: prettier spawn failed"
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

    await expect(fix([], { linter: "eslint" })).rejects.toThrow(
      "Failed to run Ultracite: eslint spawn failed"
    );
  });

  test("runs oxlint fix when linter is oxlint", async () => {
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

    await fix([], { linter: "oxlint" });

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("npx oxlint");
    expect(callArgs[0]).toContain("--fix");
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

    await fix(["src/index.ts"], { linter: "oxlint" });

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("src/index.ts");
  });

  test("oxlint fix throws on spawn error", async () => {
    const mockSpawn = mock(() => ({
      error: new Error("oxlint spawn failed"),
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

    await expect(fix([], { linter: "oxlint" })).rejects.toThrow(
      "Failed to run Ultracite: oxlint spawn failed"
    );
  });

  test("oxlint fix returns hasErrors true on failure", async () => {
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

    const result = await fix([], { linter: "oxlint" });
    expect(result.hasErrors).toBe(true);
  });
});
