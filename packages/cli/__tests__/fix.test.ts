import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import process from "node:process";
import { fix } from "../src/commands/fix";

mock.module("node:child_process", () => ({
  spawnSync: mock(() => ({ status: 0 })),
  execSync: mock(() => ""),
}));

describe("fix", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("runs biome check with --write flag", () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));

    fix([], {});

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("npx @biomejs/biome check");
    expect(callArgs[0]).toContain("--write");
    expect(callArgs[0]).toContain("--no-errors-on-unmatched");
    expect(callArgs[0]).toContain("./");
  });

  test("runs biome fix with specific files", () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));

    fix(["src/index.ts", "src/test.ts"], {});

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("src/index.ts");
    expect(callArgs[0]).toContain("src/test.ts");
  });

  test("runs biome fix with unsafe option", () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));

    fix([], { unsafe: true });

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("--unsafe");
  });

  test("does not include --unsafe when option is false", () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));

    fix([], { unsafe: false });

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).not.toContain("--unsafe");
  });

  test("handles files with special characters", () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));

    fix(["src/my file.ts"], {});

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("'src/my file.ts'");
  });

  test("exits with error code when biome fix fails", () => {
    const mockSpawn = mock(() => ({ status: 1 }));

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));

    expect(() => fix([], {})).toThrow("Ultracite fix failed with status 1");
  });

  test("exits when spawn returns error", () => {
    const mockSpawn = mock(() => ({
      error: new Error("spawn failed"),
      status: null,
    }));

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));

    expect(() => fix([], {})).toThrow("Failed to run Ultracite: spawn failed");
  });

  test("passes through arbitrary Biome flags", () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));

    fix([], { verbose: true, "max-diagnostics": 50 });

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("--verbose");
    expect(callArgs[0]).toContain("--max-diagnostics=50");
  });

  test("ignores false boolean flags", () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));

    fix([], { verbose: false, unsafe: true });

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).not.toContain("--verbose");
    expect(callArgs[0]).toContain("--unsafe");
  });
});
