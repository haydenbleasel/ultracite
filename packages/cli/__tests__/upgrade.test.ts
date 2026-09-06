import { afterAll, describe, expect, mock, test } from "bun:test";
import path from "node:path";
import process from "node:process";

import * as nypm from "nypm";

import * as doctorModule from "../src/commands/doctor";
import type { DiagnosticCheck } from "../src/commands/doctor";
import * as configResolution from "../src/config-resolution";
import type { InstalledPackage } from "../src/config-resolution";
import { biomeVersion } from "../src/dependencies";
import * as schemas from "../src/schemas";
import * as utils from "../src/utils";

// mock.module rewrites a module's live bindings, so the namespace imports
// above turn into the stubs the moment they're mocked. Snapshot the exports
// as they are when this file loads — before any of its mocks — so afterAll
// can put the modules back exactly as it found them.
const realNypm = { ...nypm };
const realDoctor = { ...doctorModule };
const realConfigResolution = { ...configResolution };
const realSchemas = { ...schemas };
const realUtils = { ...utils };

const noop = () => {
  // intentionally empty mock
};

mock.module("@clack/prompts", () => ({
  intro: mock(noop),
  log: {
    error: mock(noop),
    info: mock(noop),
    success: mock(noop),
    warn: mock(noop),
  },
  outro: mock(noop),
  spinner: mock(() => ({
    message: mock(noop),
    start: mock(noop),
    stop: mock(noop),
  })),
}));

const DEFAULT_BIN = { ultracite: "dist/index.js" };

const installed = (
  version: string,
  bin: Record<string, string> = DEFAULT_BIN
): InstalledPackage => ({
  dir: "/project/node_modules/ultracite",
  manifest: { bin, version },
});

const passingCheck: DiagnosticCheck = {
  message: "ok",
  name: "check",
  status: "pass",
};

const failingCheck: DiagnosticCheck = {
  message: "bad",
  name: "check",
  status: "fail",
};

// The running CLI's own version — the hand-off compares against it.
const { version: runningVersion } = await import("../package.json");

// mock.module is process-wide and survives mock.restore(), so put every
// module this file mocks back once it's done — otherwise the doctor and
// initialize suites see these stubs.
afterAll(() => {
  mock.module("nypm", () => realNypm);
  mock.module("../src/spawn-sync", () => ({
    spawnSync: globalThis.__realSpawnSync,
  }));
  mock.module("../src/utils", () => realUtils);
  mock.module("../src/config-resolution", () => realConfigResolution);
  mock.module("../src/schemas", () => realSchemas);
  mock.module("../src/commands/doctor", () => realDoctor);
});

interface Harness {
  addDevDependency: ReturnType<typeof mock>;
  findInstalledPackage: ReturnType<typeof mock>;
  spawnSync: ReturnType<typeof mock>;
}

interface SetupOptions {
  checks?: DiagnosticCheck[];
  linter?: string | null;
  projectDependencies?: Record<string, string>;
  versions?: (InstalledPackage | null)[];
}

const setup = (options: SetupOptions = {}): Harness => {
  const {
    checks = [passingCheck],
    linter = "biome",
    projectDependencies = {},
    versions = [],
  } = options;
  const addDevDependency = mock(() => Promise.resolve());
  const spawnSync = mock(() => ({ status: 0 }));
  const findInstalledPackage = mock((): InstalledPackage | null => null);
  for (const version of versions) {
    findInstalledPackage.mockReturnValueOnce(version);
  }

  mock.module("nypm", () => ({
    addDevDependency,
    detectPackageManager: mock(() =>
      Promise.resolve({ command: "npm", name: "npm", warnings: [] })
    ),
  }));
  mock.module("../src/spawn-sync", () => ({ spawnSync }));
  mock.module("../src/utils", () => ({
    ...realUtils,
    detectLinter: mock(() => linter),
    exists: mock(() => true),
  }));
  mock.module("../src/config-resolution", () => ({
    ...realConfigResolution,
    findInstalledPackage,
  }));
  mock.module("../src/schemas", () => ({
    ...realSchemas,
    readPackageJson: mock(() =>
      Promise.resolve({ devDependencies: projectDependencies })
    ),
  }));
  mock.module("../src/commands/doctor", () => ({
    ...realDoctor,
    reportDiagnostics: mock(() => ({
      failCount: checks.filter((c) => c.status === "fail").length,
      passCount: checks.filter((c) => c.status === "pass").length,
      warnCount: 0,
    })),
    runDiagnostics: mock(() => checks),
  }));

  return { addDevDependency, findInstalledPackage, spawnSync };
};

const loadUpgrade = async () => {
  const module = await import("../src/commands/upgrade");
  return module;
};

describe("getToolchainPackages", () => {
  test("biome installs the pinned Biome release", async () => {
    const { getToolchainPackages } = await loadUpgrade();

    expect(getToolchainPackages("biome", new Set())).toEqual([
      `@biomejs/biome@${biomeVersion}`,
    ]);
  });

  test("eslint installs the core set plus framework plugins the project already uses", async () => {
    const { getToolchainPackages } = await loadUpgrade();

    const packages = getToolchainPackages(
      "eslint",
      new Set(["eslint-plugin-react", "react"])
    );

    expect(packages).toContain("eslint@^10.0.0");
    expect(packages).toContain("prettier@^3.0.0");
    expect(packages).toContain("stylelint@^17.0.0");
    // Newer presets can require plugins an older setup never installed.
    expect(packages.some((pkg) => pkg.startsWith("eslint-plugin-jsdoc@"))).toBe(
      true
    );
    expect(packages.some((pkg) => pkg.startsWith("eslint-plugin-react@"))).toBe(
      true
    );
    // Framework plugins the project never opted into are left alone.
    expect(packages.some((pkg) => pkg.startsWith("eslint-plugin-vue@"))).toBe(
      false
    );
  });

  test("oxlint tracks latest and bumps opted-in extras only", async () => {
    const { getToolchainPackages } = await loadUpgrade();

    const packages = getToolchainPackages(
      "oxlint",
      new Set(["oxlint-tsgolint", "eslint-plugin-sonarjs"])
    );

    expect(packages).toContain("oxlint@latest");
    expect(packages).toContain("oxfmt@latest");
    expect(packages).toContain("oxlint-tsgolint@latest");
    expect(
      packages.some((pkg) => pkg.startsWith("eslint-plugin-sonarjs@"))
    ).toBe(true);
    expect(
      packages.some((pkg) => pkg.startsWith("eslint-plugin-github@"))
    ).toBe(false);
  });
});

describe("upgrade", () => {
  test("fails when no linter configuration is detected", async () => {
    setup({ linter: null });
    const { upgrade } = await loadUpgrade();

    await expect(upgrade()).rejects.toThrow("No linter configuration found");
  });

  test("rejects an unsupported package manager", async () => {
    setup();
    const { upgrade } = await loadUpgrade();

    await expect(upgrade({ pm: "cargo" })).rejects.toThrow(
      'Unsupported package manager "cargo"'
    );
  });

  test("updates ultracite then syncs the toolchain when already on this release", async () => {
    const harness = setup({
      versions: [installed("7.4.2"), installed(runningVersion)],
    });
    const { upgrade } = await loadUpgrade();

    await expect(upgrade({ pm: "npm" })).resolves.toBe(0);

    expect(harness.addDevDependency).toHaveBeenCalledTimes(2);
    const [[selfPackages], [toolchainPackages]] =
      harness.addDevDependency.mock.calls;
    expect(selfPackages).toEqual(["ultracite@latest"]);
    expect(toolchainPackages).toEqual([`@biomejs/biome@${biomeVersion}`]);
    expect(harness.spawnSync).not.toHaveBeenCalled();
  });

  test("hands off to a newer installed CLI so it syncs with its own pins", async () => {
    const harness = setup({
      versions: [installed("7.4.2"), installed("99.0.0")],
    });
    const { upgrade } = await loadUpgrade();

    await expect(upgrade({ pm: "npm" })).resolves.toBe(0);

    // Only the self-update ran here; the toolchain sync is the child's job.
    expect(harness.addDevDependency).toHaveBeenCalledTimes(1);
    expect(harness.spawnSync).toHaveBeenCalledTimes(1);
    const [[command, args, options]] = harness.spawnSync.mock.calls;
    expect(command).toBe(process.execPath);
    expect(args).toEqual([
      path.join("/project/node_modules/ultracite", "dist/index.js"),
      "upgrade",
      "--skip-self",
      "--pm",
      "npm",
    ]);
    expect(options).toEqual({ stdio: "inherit" });
  });

  test("carries the handed-off CLI's exit code", async () => {
    const harness = setup({
      versions: [installed("7.4.2"), installed("99.0.0")],
    });
    harness.spawnSync.mockReturnValue({ status: 1 });
    const { upgrade } = await loadUpgrade();

    await expect(upgrade({ pm: "npm" })).resolves.toBe(1);
  });

  test("falls back to syncing locally when the installed CLI has no binary", async () => {
    const harness = setup({
      versions: [installed("7.4.2"), installed("99.0.0", {})],
    });
    const { upgrade } = await loadUpgrade();

    await upgrade({ pm: "npm" });

    expect(harness.spawnSync).not.toHaveBeenCalled();
    expect(harness.addDevDependency).toHaveBeenCalledTimes(2);
  });

  test("--skip-self only syncs the toolchain", async () => {
    const harness = setup({
      linter: "eslint",
      projectDependencies: { "eslint-plugin-react": "^7.0.0" },
    });
    const { upgrade } = await loadUpgrade();

    await upgrade({ pm: "npm", skipSelf: true });

    expect(harness.findInstalledPackage).not.toHaveBeenCalled();
    expect(harness.addDevDependency).toHaveBeenCalledTimes(1);
    const [[packages]] = harness.addDevDependency.mock.calls;
    expect(packages).toContain("eslint@^10.0.0");
    expect(
      packages.some((pkg: string) => pkg.startsWith("eslint-plugin-react@"))
    ).toBe(true);
  });

  test("fails when the post-upgrade diagnostics still fail", async () => {
    setup({ checks: [failingCheck], versions: [null, null] });
    const { upgrade } = await loadUpgrade();

    await expect(upgrade({ pm: "npm" })).rejects.toThrow(
      "Doctor checks failed"
    );
  });
});
