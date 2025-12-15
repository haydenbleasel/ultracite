import { beforeEach, describe, expect, mock, test } from "bun:test";
import { check } from "../src/commands/check";

// Helper to create mock Biome JSON output
const createMockBiomeOutput = (errors = 0) =>
  JSON.stringify({
    summary: {
      changed: 0,
      unchanged: 1,
      matches: 0,
      duration: { secs: 0, nanos: 1_000_000 },
      scannerDuration: { secs: 0, nanos: 1_000_000 },
      errors,
      warnings: 0,
      infos: 0,
      skipped: 0,
      suggestedFixesSkipped: 0,
      diagnosticsNotPrinted: 0,
    },
    diagnostics: [],
    command: "check",
  });

mock.module("node:child_process", () => ({
  spawnSync: mock(() => ({ status: 0, stdout: createMockBiomeOutput() })),
  execSync: mock(() => ""),
}));

mock.module("nypm", () => ({
  detectPackageManager: mock(async () => ({ name: "npm" })),
  dlxCommand: mock((_pm, pkg, opts) => `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`),
}));

describe("check", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("runs biome check with default options", async () => {
    const mockSpawn = mock(() => ({
      status: 0,
      stdout: createMockBiomeOutput(),
    }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock((_pm, pkg, opts) => `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`),
    }));

    await check(undefined);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("npx @biomejs/biome check");
    expect(callArgs[0]).toContain("--no-errors-on-unmatched");
    expect(callArgs[0]).toContain("--reporter=json");
    expect(callArgs[0]).toContain("./");
  });

  test("runs biome check with specific files", async () => {
    const mockSpawn = mock(() => ({
      status: 0,
      stdout: createMockBiomeOutput(),
    }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock((_pm, pkg, opts) => `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`),
    }));

    await check([["src/index.ts", "src/test.ts"], {}]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("src/index.ts");
    expect(callArgs[0]).toContain("src/test.ts");
  });

  test("runs biome check with diagnostic-level option", async () => {
    const mockSpawn = mock(() => ({
      status: 0,
      stdout: createMockBiomeOutput(),
    }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock((_pm, pkg, opts) => `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`),
    }));

    await check([[], { "diagnostic-level": "error" }]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("--diagnostic-level=error");
  });

  test("handles files with special characters", async () => {
    const mockSpawn = mock(() => ({
      status: 0,
      stdout: createMockBiomeOutput(),
    }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock((_pm, pkg, opts) => `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`),
    }));

    await check([["src/my file.ts"], {}]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("'src/my file.ts'");
  });

  test("returns hasErrors true when biome check finds errors", async () => {
    const mockSpawn = mock(() => ({
      status: 1,
      stdout: createMockBiomeOutput(5),
    }));

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));
    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock((_pm, pkg, opts) => `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`),
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
      dlxCommand: mock((_pm, pkg, opts) => `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`),
    }));

    await expect(check(undefined)).rejects.toThrow(
      "Failed to run Ultracite: spawn failed"
    );
  });
});
