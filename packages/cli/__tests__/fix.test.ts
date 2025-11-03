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
    const mockExit = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));

    expect(() => fix([], {})).toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  test("exits when spawn returns error", () => {
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {}
    );
    const mockSpawn = mock(() => ({
      error: new Error("spawn failed"),
      status: null,
    }));
    const mockExit = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    mock.module("node:child_process", () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ""),
    }));

    expect(() => fix([], {})).toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
