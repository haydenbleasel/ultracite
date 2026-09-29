import { afterEach, describe, expect, mock, test } from "bun:test";

import {
  getUltraciteSkillInstallCommand,
  maybeInstallUltraciteSkill,
} from "../src/skill";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

// A dlxCommand that spells out its arguments, so the test sees exactly what
// would be spawned whatever other suites mocked nypm with.
mock.module("nypm", () => ({
  dlxCommand: (
    _packageManager: string,
    name: string,
    options: { args?: string[] } = {}
  ) => ["npx", name, ...(options.args ?? [])].join(" "),
}));

const mockSpawn = (status: number) => {
  const spawn = mock(() => ({ status, stdout: "" }));
  mock.module("../src/spawn-sync", () => ({ spawnSync: spawn }));
  return spawn;
};

afterEach(() => {
  mock.module("../src/spawn-sync", () => ({
    spawnSync: globalThis.__realSpawnSync,
  }));
});

describe("maybeInstallUltraciteSkill", () => {
  test("runs skills add non-interactively so it installs from init", async () => {
    // With piped stdio and no --yes, `skills add` cancels its own prompts
    // and exits without installing anything.
    const spawn = mockSpawn(0);
    mockFileSystem({});

    const installed = await maybeInstallUltraciteSkill({
      packageManager: "npm",
      quiet: true,
      shouldInstall: true,
    });
    restoreFileSystemMock();

    expect(installed).toBe(true);
    // Naming the agents stops `--yes` from installing to "all agents" when
    // it detects none, which wrote a stray top-level agent/ directory.
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      [
        "skills",
        "add",
        "haydenbleasel/ultracite",
        "--yes",
        "--agent",
        "universal",
      ],
      { stdio: "pipe" }
    );
  });

  test("also installs for agents whose project directory exists", async () => {
    const spawn = mockSpawn(0);
    mockFileSystem({ ".claude": "", ".windsurf": "" });

    await maybeInstallUltraciteSkill({
      packageManager: "npm",
      quiet: true,
      shouldInstall: true,
    });
    restoreFileSystemMock();

    expect(spawn).toHaveBeenCalledWith(
      "npx",
      [
        "skills",
        "add",
        "haydenbleasel/ultracite",
        "--yes",
        "--agent",
        "universal",
        "claude-code",
        "windsurf",
      ],
      { stdio: "pipe" }
    );
  });

  test("reports a failed install", async () => {
    mockSpawn(1);

    const installed = await maybeInstallUltraciteSkill({
      packageManager: "npm",
      quiet: true,
      shouldInstall: true,
    });

    expect(installed).toBe(false);
  });
});

describe("getUltraciteSkillInstallCommand", () => {
  test("suggests the interactive command for installing later", () => {
    expect(getUltraciteSkillInstallCommand("npm")).toBe(
      "npx skills add haydenbleasel/ultracite"
    );
  });
});
