import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import path from "node:path";
import process from "node:process";

import type { AgentAdapter } from "../src/agent-fix/agents";
import * as runAgentModule from "../src/agent-fix/run-agent";
import { fix } from "../src/commands/fix";
import type { SpawnSyncOptions } from "../src/spawn-sync";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

// mock.restore() does not undo mock.module(), and namespace imports are live
// views that would reflect the mock. Copy the real exports at load time so
// afterAll can re-install them and keep the mock from leaking into other files.
const realRunAgent = {
  AGENT_TIMEOUT_MS: runAgentModule.AGENT_TIMEOUT_MS,
  runAgent: runAgentModule.runAgent,
};

describe("fix", () => {
  afterEach(() => {
    mock.restore();
  });

  test("runs biome check with --write flag", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
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
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
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
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
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
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
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
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
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
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    const routeGroupFile =
      "/abs/path/apps/app/src/app/(app)/dashboard/page.tsx";
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    fix([routeGroupFile]);

    expect(mockSpawn).toHaveBeenCalled();
    const [callArgs] = mockSpawn.mock.calls;
    expect(callArgs[1]).toContain(routeGroupFile);
  });

  test("prefixes hyphen-starting file paths before linter delegation", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    fix(["--config=evil.mjs"]);

    expect(mockSpawn).toHaveBeenCalled();
    const [callArgs] = mockSpawn.mock.calls;
    expect(callArgs[1]).toContain("./--config=evil.mjs");
    expect(callArgs[1]).not.toContain("--config=evil.mjs");
  });

  test("throws LinterExitError when biome fix finds errors", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 1,
      })
    );

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    expect(() => fix([])).toThrow("Biome exited with code 1");
  });

  test("exits when spawn returns error", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        error: new Error("spawn failed"),
        status: null,
      })
    );

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    expect(() => fix([])).toThrow("Failed to run Biome: spawn failed");
  });

  test("throws when no linter configuration found", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => null),
    }));

    expect(() => fix([])).toThrow("No linter configuration found");
  });

  test("runs eslint fix when linter is eslint (runs eslint, prettier, stylelint)", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    fix([]);

    expect(mockSpawn).toHaveBeenCalledTimes(3);
    const [eslintCall, prettierCall, stylelintCall] = mockSpawn.mock.calls;
    expect(eslintCall[0]).toBe("eslint");
    expect(eslintCall[1]).toContain("--fix");
    expect(prettierCall[0]).toBe("prettier");
    expect(prettierCall[1]).toContain("--write");
    expect(stylelintCall[0]).toBe("stylelint");
    expect(stylelintCall[1]).toContain("--fix");
  });

  test("runs eslint fix with specific files", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    fix(["src/index.ts"]);

    // stylelint is skipped because no CSS-like targets remain after filtering
    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [eslintCall] = mockSpawn.mock.calls;
    expect(eslintCall[1]).toContain("src/index.ts");
  });

  test("eslint fix scopes stylelint to style files and directories", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    fix(["src/styles.css", "src/index.ts", "lib"]);

    expect(mockSpawn).toHaveBeenCalledTimes(3);
    const [eslintCall, prettierCall, stylelintCall] = mockSpawn.mock.calls;
    expect(eslintCall[0]).toBe("eslint");
    expect(prettierCall[0]).toBe("prettier");
    expect(stylelintCall[0]).toBe("stylelint");
    expect(stylelintCall[1]).toContain("--fix");
    expect(stylelintCall[1]).toContain("--allow-empty-input");
    expect(stylelintCall[1]).toContain("src/styles.css");
    expect(stylelintCall[1]).toContain("lib/**/*.{css,scss,sass,less}");
    expect(stylelintCall[1]).not.toContain("src/index.ts");
  });

  test("eslint fix throws LinterExitError when eslint fails", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 1,
      })
    );

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    expect(() => fix([])).toThrow("ESLint exited with code 1");
  });

  test("eslint fix throws on eslint spawn error when it is the first step", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        error: new Error("eslint spawn failed"),
        status: null,
      })
    );

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    expect(() => fix([])).toThrow("Failed to run ESLint: eslint spawn failed");
  });

  test("eslint fix throws on prettier spawn error", () => {
    let callCount = 0;
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => {
        callCount += 1;
        // eslint succeeds
        if (callCount === 1) {
          return { status: 0 };
        }
        return {
          error: new Error("prettier spawn failed"),
          status: null,
        };
      }
    );

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    expect(() => fix([])).toThrow(
      "Failed to run Prettier: prettier spawn failed"
    );
  });

  test("eslint fix throws on stylelint spawn error", () => {
    let callCount = 0;
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => {
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

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    expect(() => fix([])).toThrow(
      "Failed to run Stylelint: stylelint spawn failed"
    );
  });

  test("runs oxlint fix when linter is oxlint (runs oxlint, oxfmt)", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [oxlintCall, oxfmtCall] = mockSpawn.mock.calls;
    expect(oxlintCall[0]).toBe("oxlint");
    expect(oxlintCall[1]).toContain("--fix");
    expect(oxfmtCall[0]).toBe("oxfmt");
    expect(oxfmtCall[1]).toContain("--write");
  });

  test("runs oxlint fix with specific files", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix(["src/index.ts"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toContain("src/index.ts");
  });

  test("oxlint fix throws on spawn error", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        error: new Error("oxlint spawn failed"),
        status: null,
      })
    );

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    expect(() => fix([])).toThrow("Failed to run Oxlint: oxlint spawn failed");
  });

  test("oxlint fix throws LinterExitError on failure", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 1,
      })
    );

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    expect(() => fix([])).toThrow("Oxlint exited with code 1");
  });

  test("passes through --type-aware flag to oxlint", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([], ["--type-aware"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toContain("--type-aware");
  });

  test("passes through --type-check flag to oxlint", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([], ["--type-check"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toContain("--type-check");
  });

  test("passes through multiple flags to oxlint", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([], ["--type-aware", "--type-check"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toContain("--type-aware");
    expect(oxlintCall[1]).toContain("--type-check");
  });

  test("does not include flags when passthrough is empty", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([], []);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).not.toContain("--type-aware");
    expect(oxlintCall[1]).not.toContain("--type-check");
  });

  test("converts --unsafe to --fix-dangerously for oxlint", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    fix([], ["--unsafe"]);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[1]).toContain("--fix-dangerously");
    expect(oxlintCall[1]).not.toContain("--unsafe");
  });

  test("oxlint fix still runs oxlint when oxfmt exits non-zero", () => {
    const mockSpawn = mock(
      (cmd: string, _args: string[], _opts: SpawnSyncOptions) => {
        if (cmd === "oxfmt") {
          return { status: 1 };
        }
        return { status: 0 };
      }
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    expect(() => fix([])).toThrow("oxfmt exited with code 1");
    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const [oxlintCall] = mockSpawn.mock.calls;
    expect(oxlintCall[0]).toBe("oxlint");
  });

  test("eslint fix still runs eslint and stylelint when prettier exits non-zero", () => {
    const mockSpawn = mock(
      (cmd: string, _args: string[], _opts: SpawnSyncOptions) => {
        if (cmd === "prettier") {
          return { status: 1 };
        }
        return { status: 0 };
      }
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "eslint"),
    }));

    expect(() => fix([])).toThrow("Prettier exited with code 1");
    expect(mockSpawn).toHaveBeenCalledTimes(3);
    const [eslintCall, , stylelintCall] = mockSpawn.mock.calls;
    expect(eslintCall[0]).toBe("eslint");
    expect(stylelintCall[0]).toBe("stylelint");
  });

  test("keeps bare biome resolution with shell disabled for Windows compatibility", () => {
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
      })
    );
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));

    fix(["src/my file.ts"]);

    // Shell interpretation is disabled inside the spawn-sync adapter (see
    // spawn-sync.test.ts), so a spaced filename must survive as one argument.
    const [firstCall] = mockSpawn.mock.calls;
    const [command, args] = firstCall;
    expect(command).toBe("biome");
    expect(args).toContain("src/my file.ts");
  });

  // A biome.jsonc extending ultracite, with no ultracite in node_modules: Biome
  // would fail here with an opaque "module not found", so we stop first.
  test("fails before running biome when its extends cannot be resolved", () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));
    mockFileSystem({
      [path.join(process.cwd(), "biome.jsonc")]:
        '{"extends": ["ultracite/biome/core"]}',
    });

    try {
      expect(() => fix([])).toThrow(/could not be resolved/u);
      expect(mockSpawn).not.toHaveBeenCalled();
    } finally {
      restoreFileSystemMock();
    }
  });
});

const oxlintDiagnostics = JSON.stringify({
  diagnostics: [
    {
      code: "eslint(no-eval)",
      filename: "src/bad.ts",
      help: "Avoid eval().",
      labels: [{ span: { column: 13, line: 4 } }],
      message: "eval can be harmful.",
      severity: "error",
    },
  ],
});

const mockAgentEnvironment = ({
  agentOk = true,
  oxlintOutputs,
}: {
  agentOk?: boolean;
  oxlintOutputs: string[];
}) => {
  let oxlintCalls = 0;
  const mockSpawn = mock((cmd: string, _args: string[]) => {
    if (cmd === "claude" || cmd === "codex") {
      return { status: 0, stdout: "2.0.0" };
    }
    if (cmd === "oxlint") {
      const stdout =
        oxlintOutputs[Math.min(oxlintCalls, oxlintOutputs.length - 1)];
      oxlintCalls += 1;
      return { status: 0, stdout };
    }
    return { status: 0, stdout: "" };
  });
  const mockRunAgent = mock((_adapter: AgentAdapter, _prompt: string) =>
    Promise.resolve({ ok: agentOk, stderr: "", timedOut: false })
  );

  mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));
  mock.module("../src/utils", () => ({
    detectLinter: mock(() => "oxlint"),
  }));
  mock.module("../src/agent-fix/run-agent", () => ({
    AGENT_TIMEOUT_MS: 300_000,
    runAgent: mockRunAgent,
  }));

  return { mockRunAgent, mockSpawn };
};

describe("fix with an agent", () => {
  afterEach(() => {
    mock.restore();
  });

  afterAll(() => {
    mock.module("../src/agent-fix/run-agent", () => realRunAgent);
  });

  test("runs the agent per file and succeeds when verification clears all issues", async () => {
    const { mockRunAgent, mockSpawn } = mockAgentEnvironment({
      oxlintOutputs: [oxlintDiagnostics, '{"diagnostics":[]}'],
    });

    await fix([], [], { agent: "claude" });

    expect(mockRunAgent).toHaveBeenCalledTimes(1);
    const [agentCall] = mockRunAgent.mock.calls;
    expect(agentCall[0].command).toBe("claude");
    expect(agentCall[1]).toContain("eslint(no-eval)");
    expect(agentCall[1]).toContain("eval can be harmful.");

    // Version check, autofix pass (oxfmt + oxlint), verify pass (oxfmt + oxlint).
    const commands = mockSpawn.mock.calls.map((call) => call[0]);
    expect(commands).toEqual(["claude", "oxfmt", "oxlint", "oxfmt", "oxlint"]);

    const verifyCall = mockSpawn.mock.calls.at(4);
    expect(verifyCall?.[1]).toContain("src/bad.ts");
  });

  test("throws a LinterExitError when issues remain after the agent run", async () => {
    mockAgentEnvironment({
      oxlintOutputs: [oxlintDiagnostics, oxlintDiagnostics],
    });

    await expect(fix([], [], { agent: "claude" })).rejects.toThrow(
      "Oxlint exited with code 1"
    );
  });

  test("retries with a follow-up prompt when the first attempt leaves issues", async () => {
    const { mockRunAgent } = mockAgentEnvironment({
      // Autofix pass reports one issue; the first verify still reports it
      // (superficial fix); the second verify comes back clean.
      oxlintOutputs: [
        oxlintDiagnostics,
        oxlintDiagnostics,
        '{"diagnostics":[]}',
      ],
    });

    await fix([], [], { agent: "claude" });

    expect(mockRunAgent).toHaveBeenCalledTimes(2);
    const retryCall = mockRunAgent.mock.calls.at(1);
    expect(retryCall?.[1]).toContain("attempt 2");
    expect(retryCall?.[1]).toContain("did not resolve");
  });

  test("stops retrying after the attempt limit and reports failure", async () => {
    const { mockRunAgent } = mockAgentEnvironment({
      oxlintOutputs: [oxlintDiagnostics, oxlintDiagnostics],
    });

    await expect(fix([], [], { agent: "claude" })).rejects.toThrow(
      "Oxlint exited with code 1"
    );

    expect(mockRunAgent).toHaveBeenCalledTimes(3);
  });

  test("does not spawn an agent when autofix leaves no issues", async () => {
    const { mockRunAgent } = mockAgentEnvironment({
      oxlintOutputs: ['{"diagnostics":[]}'],
    });

    await fix([], [], { agent: "codex" });

    expect(mockRunAgent).not.toHaveBeenCalled();
  });

  test("maps --unsafe to --fix-dangerously in agent mode", async () => {
    const { mockSpawn } = mockAgentEnvironment({
      oxlintOutputs: ['{"diagnostics":[]}'],
    });

    await fix([], ["--unsafe"], { agent: "claude" });

    const oxlintCall = mockSpawn.mock.calls.find(
      (call) => call[0] === "oxlint"
    );
    expect(oxlintCall?.[1]).toContain("--fix-dangerously");
    expect(oxlintCall?.[1]).not.toContain("--unsafe");
  });

  test("throws a setup error when the agent CLI is not installed", async () => {
    const mockSpawn = mock(() => ({
      error: new Error("ENOENT"),
      status: null,
    }));
    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "oxlint"),
    }));

    await expect(fix([], [], { agent: "claude" })).rejects.toThrow(
      "npm install -g @anthropic-ai/claude-code"
    );
  });

  test("agent mode works with the biome adapter", async () => {
    const biomeDiagnostics = JSON.stringify({
      diagnostics: [
        {
          category: "lint/security/noGlobalEval",
          location: { path: "src/bad.ts", start: { column: 13, line: 4 } },
          message: "eval() exposes to security risks.",
          severity: "error",
        },
      ],
    });
    let biomeCalls = 0;
    const mockSpawn = mock((cmd: string, _args: string[]) => {
      if (cmd === "claude") {
        return { status: 0, stdout: "2.0.0" };
      }
      if (cmd === "biome") {
        biomeCalls += 1;
        return {
          status: 0,
          stdout: biomeCalls === 1 ? biomeDiagnostics : '{"diagnostics":[]}',
        };
      }
      return { status: 0, stdout: "" };
    });
    const mockRunAgent = mock(() =>
      Promise.resolve({ ok: true, stderr: "", timedOut: false })
    );
    mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));
    mock.module("../src/utils", () => ({
      detectLinter: mock(() => "biome"),
    }));
    mock.module("../src/agent-fix/run-agent", () => ({
      AGENT_TIMEOUT_MS: 300_000,
      runAgent: mockRunAgent,
    }));

    await fix([], [], { agent: "claude" });

    expect(mockRunAgent).toHaveBeenCalledTimes(1);
    expect(biomeCalls).toBe(2);
  });
});
