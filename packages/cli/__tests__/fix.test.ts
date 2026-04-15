import { afterEach, describe, expect, mock, test } from "bun:test";

import { fix } from "../src/commands/fix";

describe("fix", () => {
  afterEach(() => {
    mock.restore();
  });

  test("runs biome check with --write flag", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    fix([]);

    expect(mockSpawn).toHaveBeenCalled();
    const [callArgs] = mockSpawn.mock.calls;
    expect(callArgs[0]).toBe("biome");
    expect(callArgs[1]).toContain("check");
    expect(callArgs[1]).toContain("--write");
    expect(callArgs[1]).toContain("--no-errors-on-unmatched");
    expect(callArgs[1]).toContain("./");
  });

  test("runs biome fix with specific files", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    fix(["src/index.ts", "src/test.ts"]);

    expect(mockSpawn).toHaveBeenCalled();
    const [callArgs] = mockSpawn.mock.calls;
    expect(callArgs[1]).toContain("src/index.ts");
    expect(callArgs[1]).toContain("src/test.ts");
  });

  test("passes through --unsafe option to biome", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    fix([], ["--unsafe"]);

    expect(mockSpawn).toHaveBeenCalled();
    const [callArgs] = mockSpawn.mock.calls;
    expect(callArgs[1]).toContain("--unsafe");
  });

  test("does not include --unsafe when passthrough is empty", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    fix([], []);

    expect(mockSpawn).toHaveBeenCalled();
    const [callArgs] = mockSpawn.mock.calls;
    expect(callArgs[1]).not.toContain("--unsafe");
  });

  test("handles files with special characters", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    fix(["src/my file.ts"]);

    expect(mockSpawn).toHaveBeenCalled();
    const [callArgs] = mockSpawn.mock.calls;
    expect(callArgs[1]).toContain("src/my file.ts");
  });

  test("passes absolute Next.js route-group paths through without quoting", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    const routeGroupFile =
      "/abs/path/apps/app/src/app/(app)/dashboard/page.tsx";
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    fix([routeGroupFile]);

    expect(mockSpawn).toHaveBeenCalled();
    const [callArgs] = mockSpawn.mock.calls;
    expect(callArgs[1]).toContain(routeGroupFile);
  });

  test("throws LinterExitError when biome fix finds errors", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 1,
      })
    );

    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    expect(() => fix([])).toThrow("Biome exited with code 1");
  });

  test("exits when spawn returns error", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        error: new Error("spawn failed"),
        status: null,
      })
    );

    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    expect(() => fix([])).toThrow("Failed to run Biome: spawn failed");
  });

  test("throws when no linter configuration found", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => null),
    }));

    expect(() => fix([])).toThrow("No linter configuration found");
  });

  test("runs eslint fix when linter is eslint (runs prettier, eslint, stylelint)", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    fix([]);

    expect(mockSpawn).toHaveBeenCalledTimes(3);
    const [prettierCall, eslintCall, stylelintCall] = mockSpawn.mock.calls;
    expect(prettierCall[0]).toBe("prettier");
    expect(prettierCall[1]).toContain("--write");
    expect(eslintCall[0]).toBe("eslint");
    expect(eslintCall[1]).toContain("--fix");
    expect(stylelintCall[0]).toBe("stylelint");
    expect(stylelintCall[1]).toContain("--fix");
  });

  test("runs eslint fix with specific files", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    fix(["src/index.ts"]);

    expect(mockSpawn).toHaveBeenCalledTimes(3);
    const [, eslintCall] = mockSpawn.mock.calls;
    expect(eslintCall[1]).toContain("src/index.ts");
  });

  test("eslint fix throws LinterExitError when prettier fails", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 1,
      })
    );

    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    expect(() => fix([])).toThrow("Prettier exited with code 1");
  });

  test("eslint fix throws on prettier spawn error", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        error: new Error("prettier spawn failed"),
        status: null,
      })
    );

    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    expect(() => fix([])).toThrow(
      "Failed to run Prettier: prettier spawn failed"
    );
  });

  test("eslint fix throws on eslint spawn error", () => {
    let callCount = 0;
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => {
        callCount += 1;
        // prettier succeeds
        if (callCount === 1) {
          return { status: 0 };
        }
        return {
          error: new Error("eslint spawn failed"),
          status: null,
        };
      }
    );

    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    expect(() => fix([])).toThrow("Failed to run ESLint: eslint spawn failed");
  });

  test("eslint fix throws on stylelint spawn error", () => {
    let callCount = 0;
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => {
        callCount += 1;
        // prettier and eslint succeed
        if (callCount <= 2) {
          return { status: 0 };
        }
        return {
          error: new Error("stylelint spawn failed"),
          status: null,
        };
      }
    );

    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    expect(() => fix([])).toThrow(
      "Failed to run Stylelint: stylelint spawn failed"
    );
  });

  test("runs oxlint fix when linter is oxlint (runs oxfmt, oxlint)", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [oxfmtCall, oxlintCall] = mockSpawn.mock.calls;
    expect(oxfmtCall[0]).toBe("oxfmt");
    expect(oxfmtCall[1]).toContain("--write");
    expect(oxlintCall[0]).toBe("oxlint");
    expect(oxlintCall[1]).toContain("--fix");
  });

  test("runs oxlint fix with specific files", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix(["src/index.ts"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [, oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toContain("src/index.ts");
  });

  test("oxlint fix throws on spawn error", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        error: new Error("oxfmt spawn failed"),
        status: null,
      })
    );

    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    expect(() => fix([])).toThrow("Failed to run oxfmt: oxfmt spawn failed");
  });

  test("oxlint fix throws LinterExitError on failure", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 1,
      })
    );

    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    expect(() => fix([])).toThrow("oxfmt exited with code 1");
  });

  test("passes through --type-aware flag to oxlint", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([], ["--type-aware"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [, oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toContain("--type-aware");
  });

  test("passes through --type-check flag to oxlint", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([], ["--type-check"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [, oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toContain("--type-check");
  });

  test("passes through multiple flags to oxlint", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([], ["--type-aware", "--type-check"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [, oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toContain("--type-aware");
    expect(oxlintCall[1]).toContain("--type-check");
  });

  test("does not include flags when passthrough is empty", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([], []);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [, oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).not.toContain("--type-aware");
    expect(oxlintCall[1]).not.toContain("--type-check");
  });

  test("converts --unsafe to --fix-dangerously for oxlint", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([], ["--unsafe"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [, oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toContain("--fix-dangerously");
    expect(oxlintCall[1]).not.toContain("--unsafe");
  });

  test("keeps bare biome resolution with shell disabled for Windows compatibility", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
      })
    );
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    fix(["src/my file.ts"]);

    const [firstCall] = mockSpawn.mock.calls;
    const [command, , options] = firstCall;
    expect(command).toBe("biome");
    expect(options.shell).toBe(false);
  });
});
