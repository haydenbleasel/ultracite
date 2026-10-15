import { afterAll, describe, expect, mock, test } from "bun:test";
import path from "node:path";
import process from "node:process";

import * as nypm from "nypm";

import * as doctorModule from "../src/commands/doctor";
import type { DiagnosticCheck } from "../src/commands/doctor";
import * as configResolution from "../src/config-resolution";
import type { InstalledPackage } from "../src/config-resolution";
import {
  biomeVersion,
  OXLINT_TOOLCHAIN_DEV_DEPENDENCIES,
} from "../src/dependencies";
import * as schemas from "../src/schemas";
import * as upgradeAgent from "../src/upgrade-agent";
import * as upgradeGuides from "../src/upgrade-guides";
import type { UpgradeGuide } from "../src/upgrade-guides";
import * as utils from "../src/utils";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

// mock.module rewrites a module's live bindings, so the namespace imports
// above turn into the stubs the moment they're mocked. Snapshot the exports
// as they are when this file loads — before any of its mocks — so afterAll
// can put the modules back exactly as it found them.
const realNypm = { ...nypm };
const realDoctor = { ...doctorModule };
const realConfigResolution = { ...configResolution };
const realSchemas = { ...schemas };
const realUtils = { ...utils };
const realUpgradeAgent = { ...upgradeAgent };
const realUpgradeGuides = { ...upgradeGuides };

const noop = () => {
  // intentionally empty mock
};

const warn = mock((_message: string) => {
  // intentionally empty mock
});

mock.module("@clack/prompts", () => ({
  intro: mock(noop),
  log: {
    error: mock(noop),
    info: mock(noop),
    success: mock(noop),
    warn,
  },
  outro: mock(noop),
  spinner: mock(() => ({
    error: mock(noop),
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
  mock.module("../src/upgrade-agent", () => realUpgradeAgent);
  mock.module("../src/upgrade-guides", () => realUpgradeGuides);
});

const v7Guide: UpgradeGuide = {
  content: "# Upgrading to Ultracite v7",
  path: "skills/ultracite/references/upgrades/v7.md",
  version: 7,
};

interface Harness {
  addDevDependency: ReturnType<typeof mock>;
  addEslintPeerOverrides: ReturnType<typeof mock>;
  findInstalledPackage: ReturnType<typeof mock>;
  migrateWithAgent: ReturnType<typeof mock>;
  spawnSync: ReturnType<typeof mock>;
  steps: string[];
}

interface SetupOptions {
  checks?: DiagnosticCheck[];
  /** What every install rejects with, when installs should fail. */
  installError?: Error;
  linter?: string | null;
  /** Guides the agent leaves undone. */
  leftAfterAgent?: UpgradeGuide[];
  /** Guides the project needs before the configuration step. */
  pending?: UpgradeGuide[];
  projectDependencies?: Record<string, string>;
  versions?: (InstalledPackage | null)[];
}

const setup = (options: SetupOptions = {}): Harness => {
  const {
    checks = [passingCheck],
    installError,
    leftAfterAgent = [],
    linter = "biome",
    pending = [],
    projectDependencies = {},
    versions = [],
  } = options;

  warn.mockClear();

  const migrateWithAgent = mock(() =>
    Promise.resolve({ failure: null, remaining: leftAfterAgent })
  );

  mock.module("../src/upgrade-guides", () => ({
    ...realUpgradeGuides,
    findPendingGuides: mock(() => pending),
  }));
  mock.module("../src/upgrade-agent", () => ({
    ...realUpgradeAgent,
    migrateWithAgent,
  }));
  // Records the order of installs and package.json override edits.
  const steps: string[] = [];

  const addDevDependency = mock((packages: string[]) => {
    steps.push(`install ${packages.join(" ")}`);

    return installError ? Promise.reject(installError) : Promise.resolve();
  });

  const addEslintPeerOverrides = mock((names: readonly string[]) => {
    steps.push(`overrides ${names.join(" ")}`);

    return Promise.resolve();
  });

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
    addEslintPeerOverrides,
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

  return {
    addDevDependency,
    addEslintPeerOverrides,
    findInstalledPackage,
    migrateWithAgent,
    spawnSync,
    steps,
  };
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

    expect(packages).toContain("eslint@^10.9.0");
    expect(packages).toContain("prettier@^3.5.3");
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

  test("eslint installs the plugins of every framework preset the config imports", async () => {
    const { getToolchainPackages } = await loadUpgrade();

    const packages = getToolchainPackages(
      "eslint",
      new Set(),
      new Set(["nestjs"])
    );

    expect(
      packages.some((pkg) =>
        pkg.startsWith("@darraghor/eslint-plugin-nestjs-typed@")
      )
    ).toBe(true);
    expect(packages.some((pkg) => pkg.startsWith("eslint-plugin-vue@"))).toBe(
      false
    );
  });

  test("reads the framework presets the ESLint config imports", async () => {
    const { getConfiguredEslintFrameworks } = await loadUpgrade();
    mockFileSystem({
      [path.join(process.cwd(), "eslint.config.mjs")]: [
        'import core from "ultracite/eslint/core";',
        'import nestjs from "ultracite/eslint/nestjs";',
        "",
        "export default [...core, ...nestjs];",
      ].join("\n"),
    });

    try {
      expect([...getConfiguredEslintFrameworks()]).toEqual(["core", "nestjs"]);
    } finally {
      restoreFileSystemMock();
    }
  });

  test("oxlint tracks latest and bumps opted-in extras only", async () => {
    const { getToolchainPackages } = await loadUpgrade();

    const packages = getToolchainPackages(
      "oxlint",
      new Set([
        "eslint-plugin-jsdoc",
        "eslint-plugin-sonarjs",
        "eslint-plugin-tsdoc",
        "oxlint-tsgolint",
      ])
    );

    expect(packages).toContain(
      `oxlint@${OXLINT_TOOLCHAIN_DEV_DEPENDENCIES.oxlint}`
    );
    expect(packages).toContain(
      `oxfmt@${OXLINT_TOOLCHAIN_DEV_DEPENDENCIES.oxfmt}`
    );
    expect(packages).toContain(
      `oxlint-tsgolint@${OXLINT_TOOLCHAIN_DEV_DEPENDENCIES["oxlint-tsgolint"]}`
    );
    expect(
      packages.some((pkg) => pkg.startsWith("eslint-plugin-sonarjs@"))
    ).toBe(true);
    expect(packages.some((pkg) => pkg.startsWith("eslint-plugin-jsdoc@"))).toBe(
      true
    );
    expect(packages.some((pkg) => pkg.startsWith("eslint-plugin-tsdoc@"))).toBe(
      true
    );
    expect(
      packages.some((pkg) => pkg.startsWith("eslint-plugin-github@"))
    ).toBe(false);
  });

  // Bun isn't an npm package, and oxlint and oxfmt are only there for the
  // editor extensions, so nothing is added that the project doesn't have.
  test("bun refreshes only the packages the project already has", async () => {
    const { getToolchainPackages } = await loadUpgrade();

    expect(getToolchainPackages("bun", new Set())).toEqual([]);
    expect(
      getToolchainPackages(
        "bun",
        new Set(["eslint-plugin-sonarjs", "oxfmt", "oxlint"])
      )
    ).toEqual([
      `oxfmt@${OXLINT_TOOLCHAIN_DEV_DEPENDENCIES.oxfmt}`,
      `oxlint@${OXLINT_TOOLCHAIN_DEV_DEPENDENCIES.oxlint}`,
      expect.stringMatching(/^eslint-plugin-sonarjs@/u),
    ]);
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

  test("overrides the eslint peer of plugins behind ESLint 10 before installing on npm", async () => {
    const harness = setup({
      linter: "eslint",
      projectDependencies: {
        eslint: "^10.0.0",
        "eslint-plugin-react": "^7.0.0",
      },
      versions: [installed(runningVersion), installed(runningVersion)],
    });

    const { upgrade } = await loadUpgrade();

    await expect(upgrade({ pm: "npm" })).resolves.toBe(0);

    expect(harness.steps[0]).toBe("overrides eslint-plugin-react");
    expect(harness.steps[1]).toBe("install ultracite@latest");
    expect(harness.steps[2]).toBe("overrides eslint-plugin-react");
    expect(harness.steps[3]).toStartWith("install ");
  });

  test("leaves overrides alone on package managers that only warn about peers", async () => {
    const harness = setup({
      linter: "eslint",
      projectDependencies: { "eslint-plugin-react": "^7.0.0" },
      versions: [installed(runningVersion), installed(runningVersion)],
    });

    const { upgrade } = await loadUpgrade();

    await expect(upgrade({ pm: "pnpm" })).resolves.toBe(0);

    expect(harness.addEslintPeerOverrides).not.toHaveBeenCalled();
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

  test("lets the handed-off CLI detect the package manager when --pm wasn't passed", async () => {
    const harness = setup({
      versions: [installed("7.4.2"), installed("99.0.0")],
    });

    const { upgrade } = await loadUpgrade();

    await expect(upgrade()).resolves.toBe(0);

    const [[, args]] = harness.spawnSync.mock.calls;
    expect(args).toEqual([
      path.join("/project/node_modules/ultracite", "dist/index.js"),
      "upgrade",
      "--skip-self",
    ]);
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
    expect(packages).toContain("eslint@^10.9.0");
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

  test("--version installs that release", async () => {
    const harness = setup({
      versions: [installed("7.4.2"), installed(runningVersion)],
    });

    const { upgrade } = await loadUpgrade();

    await expect(upgrade({ pm: "npm", version: "7" })).resolves.toBe(0);

    const [[selfPackages]] = harness.addDevDependency.mock.calls;
    expect(selfPackages).toEqual(["ultracite@7"]);
  });

  test("rejects a --version that isn't a release", async () => {
    const harness = setup();
    const { upgrade } = await loadUpgrade();

    await expect(
      upgrade({ pm: "npm", version: "7 --registry=https://example.com" })
    ).rejects.toThrow("isn't a version");
    expect(harness.addDevDependency).not.toHaveBeenCalled();
  });

  test("rejects --claude or --codex with a release before 8, before installing anything", async () => {
    const harness = setup();
    const { upgrade } = await loadUpgrade();

    await expect(
      upgrade({ agent: "claude", pm: "npm", version: "7" })
    ).rejects.toThrow("`--claude` needs Ultracite 8 or later");
    await expect(
      upgrade({ agent: "codex", pm: "npm", version: "7.12.4" })
    ).rejects.toThrow("`--codex` needs Ultracite 8 or later");
    expect(harness.addDevDependency).not.toHaveBeenCalled();
  });

  test("explains a failed install instead of throwing its stack", async () => {
    setup({
      installError: new Error(
        "`npm install -D ultracite@latest` failed.\n\nnpm error code ERESOLVE\nnpm error ERESOLVE could not resolve"
      ),
    });
    const { upgrade } = await loadUpgrade();

    const failure = upgrade({ pm: "npm" });

    await expect(failure).rejects.toBeInstanceOf(
      realConfigResolution.UltraciteSetupError
    );
    await expect(failure).rejects.toThrow("npm couldn't install the packages.");
    await expect(failure).rejects.toThrow("npm error code ERESOLVE");
    await expect(failure).rejects.toThrow("legacy-peer-deps=true");
    await expect(failure).rejects.toThrow("run `ultracite upgrade` again");
  });

  test("hands the agent to the installed CLI", async () => {
    const harness = setup({
      versions: [installed("7.4.2"), installed("99.0.0")],
    });

    const { upgrade } = await loadUpgrade();

    await expect(upgrade({ agent: "codex", pm: "npm" })).resolves.toBe(0);

    const handOff = harness.spawnSync.mock.calls.find(
      ([command]) => command === process.execPath
    );

    expect(handOff?.[1]).toEqual([
      path.join("/project/node_modules/ultracite", "dist/index.js"),
      "upgrade",
      "--skip-self",
      "--pm",
      "npm",
      "--codex",
    ]);
  });

  test("points at the guides when the configuration is out of date", async () => {
    const harness = setup({ pending: [v7Guide] });
    const { upgrade } = await loadUpgrade();

    await expect(upgrade({ pm: "npm", skipSelf: true })).resolves.toBe(0);

    expect(harness.migrateWithAgent).not.toHaveBeenCalled();
    expect(String(warn.mock.calls[0]?.[0])).toContain("--claude");
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      "skills/ultracite/references/upgrades/v7.md"
    );
  });

  test("has the agent apply the guides", async () => {
    const harness = setup({ pending: [v7Guide] });
    const { upgrade } = await loadUpgrade();

    await expect(
      upgrade({ agent: "claude", pm: "npm", skipSelf: true })
    ).resolves.toBe(0);

    expect(harness.migrateWithAgent).toHaveBeenCalledWith("claude", {
      guides: [v7Guide],
      linter: "biome",
      version: runningVersion,
    });
  });

  test("fails when the agent leaves changes undone", async () => {
    setup({ leftAfterAgent: [v7Guide], pending: [v7Guide] });
    const { upgrade } = await loadUpgrade();

    await expect(
      upgrade({ agent: "claude", pm: "npm", skipSelf: true })
    ).rejects.toThrow(realDoctor.DOCTOR_FAILED);
  });
});
