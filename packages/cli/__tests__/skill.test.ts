import { afterEach, describe, expect, mock, test } from "bun:test";

import {
  getUltraciteSkillInstallCommand,
  maybeInstallUltraciteSkill,
} from "../src/skill";

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

    const installed = await maybeInstallUltraciteSkill({
      packageManager: "npm",
      quiet: true,
      shouldInstall: true,
    });

    expect(installed).toBe(true);
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      ["skills", "add", "haydenbleasel/ultracite", "--yes"],
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
