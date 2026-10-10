import { afterAll, describe, expect, mock, test } from "bun:test";

import type { PackageManager } from "nypm";

import { UltraciteSetupError } from "../src/config-resolution";
import { OXLINT_TOOLCHAIN_DEV_DEPENDENCIES } from "../src/dependencies";
import {
  initialize,
  initializeLefthook,
  initializeLintStaged,
  initializePreCommit,
  initializePrecommitHook,
  installDependencies,
  migrateLinterConfig,
  normalizeInitializeFlags,
  upsertAgents,
  upsertBiomeConfig,
  upsertEditorConfig,
  upsertEslintConfig,
  upsertHooks,
  upsertOxfmtConfig,
  upsertOxlintConfig,
  upsertPrettierConfig,
  upsertStylelintConfig,
  upsertTsConfig,
  validateInitializeFlags,
} from "../src/initialize";
import * as utils from "../src/utils";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

const npmPm: PackageManager = { command: "npm", name: "npm" };

// Other suites mock utils.detectLinter and the mock outlives them, so pin it
// here: init only falls back to the detected linter when no --linter is given,
// and these tests expect a project with no linter config.
const realUtils = { ...utils };
const mockDetectLinter = mock((): utils.Linter | null => null);
mock.module("../src/utils", () => ({
  ...realUtils,
  detectLinter: mockDetectLinter,
}));

afterAll(() => {
  mock.module("../src/utils", () => realUtils);
});

// Data package mocks are in preload.ts (must run before imports)

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  mkdir: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve('{"name": "test"}')),
  rm: mock(() => Promise.resolve()),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("../src/spawn-sync", () => ({
  spawnSync: mock(() => ({ status: 0, stdout: "[]" })),
}));

mock.module("nypm", () => ({
  addDevDependency: mock(() => Promise.resolve()),
  detectPackageManager: mock(() =>
    Promise.resolve({ name: "npm", warnings: [] })
  ),
  dlxCommand: mock((_pm: string, pkg: string, options?: { args?: string[] }) =>
    pkg === "skills"
      ? `npx skills ${options?.args?.join(" ") ?? ""}`.trim()
      : "npx ultracite fix"
  ),
  removeDependency: mock(() => Promise.resolve()),
}));

mock.module("fast-glob", () => ({
  default: mock(() => Promise.resolve([])),
}));

// noop function to satisfy linter
const noop = () => {
  // intentionally empty mock
};

mock.module("@clack/prompts", () => ({
  cancel: mock(noop),
  confirm: mock(() => Promise.resolve(false)),
  intro: mock(noop),
  isCancel: mock(() => false),
  log: {
    error: mock(noop),
    info: mock(noop),
    success: mock(noop),
    warn: mock(noop),
  },
  multiselect: mock(() => Promise.resolve([])),
  outro: mock(noop),
  select: mock(() => Promise.resolve("biome")),
  spinner: mock(() => ({
    message: mock(noop),
    start: mock(noop),
    stop: mock(noop),
  })),
}));

const CANCEL = Symbol.for("cancel");

// Runs init with every prompt answered (Oxlint for the linter, nothing for
// the rest) except the one whose message contains `cancelledPrompt`, which
// the user cancels. Returns the spies that show whether setup went ahead.
const runCancelledInit = async (
  cancelledPrompt: string,
  flags: Parameters<typeof initialize>[0]
) => {
  const mockCancel = mock(noop);
  const mockSuccess = mock(noop);
  const mockWriteFile = mock(() => Promise.resolve());
  const answer = <Value>(prompt: { message: string }, value: Value) =>
    prompt.message.includes(cancelledPrompt) ? CANCEL : Promise.resolve(value);

  mock.module("node:fs/promises", () => ({
    access: mock(() => Promise.reject(new Error("ENOENT"))),
    mkdir: mock(() => Promise.resolve()),
    readFile: mock(() => Promise.resolve('{"name": "test"}')),
    rm: mock(() => Promise.resolve()),
    writeFile: mockWriteFile,
  }));
  mock.module("@clack/prompts", () => ({
    cancel: mockCancel,
    confirm: mock(() => Promise.resolve(false)),
    intro: mock(noop),
    isCancel: mock((value) => value === CANCEL),
    log: {
      error: mock(noop),
      info: mock(noop),
      success: mockSuccess,
      warn: mock(noop),
    },
    multiselect: mock((prompt: { message: string }) => answer(prompt, [])),
    outro: mock(noop),
    select: mock((prompt: { message: string }) => answer(prompt, "oxlint")),
    spinner: mock(() => ({
      message: mock(noop),
      start: mock(noop),
      stop: mock(noop),
    })),
  }));
  mock.module("nypm", () => ({
    addDevDependency: mock(() => Promise.resolve()),
    detectPackageManager: mock(() =>
      Promise.resolve({ name: "npm", warnings: [] })
    ),
    dlxCommand: mock(() => "npx ultracite fix"),
    removeDependency: mock(() => Promise.resolve()),
  }));

  await initialize(flags);

  return { mockCancel, mockSuccess, mockWriteFile };
};

const expectStoppedBeforeSetup = ({
  mockCancel,
  mockSuccess,
  mockWriteFile,
}: Awaited<ReturnType<typeof runCancelledInit>>) => {
  expect(mockCancel).toHaveBeenCalledWith("Operation cancelled.");
  expect(mockWriteFile).not.toHaveBeenCalled();
  expect(mockSuccess).not.toHaveBeenCalled();
};

describe("initialize", () => {
  // Note: We don't call mock.restore() here because it causes issues
  // with module re-loading when the tests transition between each other

  test("shows editor config prompt when editors not specified", async () => {
    const mockMultiselect = mock(() => Promise.resolve([]));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mockMultiselect,
      outro: mock(noop),
      select: mock(() => Promise.resolve("biome")),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    // --linter alone leaves the rest of init interactive.
    await initialize({ linter: "biome", skipInstall: true });

    expect(mockMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which editors do you want to configure (recommended)?",
      })
    );
  });

  test("shows agent file prompt when agents not specified", async () => {
    const mockMultiselect = mock(() => Promise.resolve([]));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mockMultiselect,
      outro: mock(noop),
      select: mock(() => Promise.resolve("biome")),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    // --linter alone leaves the rest of init interactive.
    await initialize({ linter: "biome", skipInstall: true });

    expect(mockMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which agents do you use (optional)?",
        options: expect.arrayContaining([
          expect.objectContaining({
            label:
              "Universal (creates AGENTS.md for Codex, Jules, Devin, and more)",
            value: "universal",
          }),
          expect.objectContaining({
            label:
              "Claude Code (creates AGENTS.md, imported from your CLAUDE.md)",
            value: "claude",
          }),
        ]),
      })
    );
  });

  test("shows hooks prompt when hooks not specified", async () => {
    const mockMultiselect = mock(() => Promise.resolve([]));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mockMultiselect,
      outro: mock(noop),
      select: mock(() => Promise.resolve("biome")),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    // --linter alone leaves the rest of init interactive.
    await initialize({ linter: "biome", skipInstall: true });

    expect(mockMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which agent hooks do you want to enable (optional)?",
      })
    );
  });

  test("cancels when user cancels editor config prompt", async () => {
    expectStoppedBeforeSetup(
      await runCancelledInit("editors", { linter: "biome", skipInstall: true })
    );
  });

  test("cancels when user cancels agents prompt", async () => {
    expectStoppedBeforeSetup(
      await runCancelledInit("agents do you use", {
        linter: "biome",
        skipInstall: true,
      })
    );
  });

  test.each<Parameters<typeof initialize>[0]>([
    { pm: "npm" },
    { agents: [] },
    { editors: [] },
    { hooks: [] },
    { integrations: [] },
    { frameworks: [] },
    { "workspace-framework": [] },
  ])("skips every prompt when %p is passed", async (flags) => {
    const mockMultiselect = mock(() => Promise.resolve([]));
    const mockSelect = mock(() => Promise.resolve("biome"));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mockMultiselect,
      outro: mock(noop),
      select: mockSelect,
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));
    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await initialize({ ...flags, skipInstall: true });

    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockMultiselect).not.toHaveBeenCalled();
  });

  test("uses eslint linter when selected", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      select: mock(() => Promise.resolve("eslint")),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      linter: "eslint",
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("uses oxlint linter when selected", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      select: mock(() => Promise.resolve("oxlint")),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      linter: "oxlint",
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("asks which optional Oxlint JS plugins to enable in interactive setup", async () => {
    const mockMultiselect = mock((promptOptions: { message?: string }) => {
      if (promptOptions.message?.includes("JS plugins")) {
        return Promise.resolve([
          "@shadcn/lint",
          "anti-slop",
          "eslint-plugin-github",
          "eslint-plugin-jsdoc",
          "eslint-plugin-sonarjs",
          "eslint-plugin-tsdoc",
          "oxlint-plugin-react-doctor",
        ]);
      }
      return Promise.resolve([]);
    });
    const writtenContents: string[] = [];

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mock((_path: string, content: string) => {
        writtenContents.push(content);
        return Promise.resolve();
      }),
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mockMultiselect,
      outro: mock(noop),
      select: mock(() => Promise.resolve("oxlint")),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    restoreFileSystemMock();
    await initialize({ skipInstall: true });

    expect(mockMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which JS plugins would you like to add (optional)?",
        options: [
          {
            hint: "design-system rules for Tailwind v4 components",
            label: "@shadcn/lint",
            value: "@shadcn/lint",
          },
          {
            hint: "vendored opinionated preset, nothing to install",
            label: "anti-slop",
            value: "anti-slop",
          },
          { label: "eslint-plugin-github", value: "eslint-plugin-github" },
          {
            hint: "require docs for public TypeScript APIs",
            label: "eslint-plugin-jsdoc",
            value: "eslint-plugin-jsdoc",
          },
          { label: "eslint-plugin-sonarjs", value: "eslint-plugin-sonarjs" },
          {
            hint: "validate TSDoc syntax in TypeScript comments",
            label: "eslint-plugin-tsdoc",
            value: "eslint-plugin-tsdoc",
          },
          {
            label: "oxlint-plugin-react-doctor",
            value: "oxlint-plugin-react-doctor",
          },
        ],
      })
    );
    expect(
      writtenContents.some((content) =>
        content.includes('"ultracite/oxlint/js-plugins"')
      )
    ).toBe(true);
    expect(
      writtenContents.some((content) =>
        content.includes('"ultracite/oxlint/anti-slop"')
      )
    ).toBe(true);
    expect(
      writtenContents.some((content) =>
        content.includes('"ultracite/oxlint/shadcn"')
      )
    ).toBe(true);
  });

  test("installs Oxlint JS plugin dependencies when js-plugins flag is set", async () => {
    const installedPackages: string[] = [];
    const mockAddDep = mock((pkg: string | string[]) => {
      installedPackages.push(...(Array.isArray(pkg) ? pkg : [pkg]));
      return Promise.resolve();
    });

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("nypm", () => ({
      addDevDependency: mockAddDep,
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      "js-plugins": [
        "@shadcn/lint",
        "anti-slop",
        "eslint-plugin-github",
        "eslint-plugin-jsdoc",
        "eslint-plugin-sonarjs",
        "eslint-plugin-tsdoc",
        "oxlint-plugin-react-doctor",
      ],
      linter: "oxlint",
      pm: "npm",
      skipInstall: false,
    });

    expect(installedPackages).toContain("@shadcn/lint@^0.2.0");
    expect(installedPackages).toContain("eslint-plugin-github@6.1.2");
    expect(installedPackages).toContain("eslint-plugin-jsdoc@^65.1.0");
    expect(installedPackages).toContain("eslint-plugin-sonarjs@^4.2.2");
    expect(installedPackages).toContain("eslint-plugin-tsdoc@^0.5.4");
    expect(installedPackages).toContain("oxlint-plugin-react-doctor@^0.9.16");
    // anti-slop is vendored inside ultracite — nothing to install for it.
    expect(installedPackages.every((pkg) => !pkg.includes("anti-slop"))).toBe(
      true
    );
  });

  test("installs oxlint-tsgolint when type-aware flag is set with oxlint", async () => {
    const installedPackages: string[] = [];
    const mockAddDep = mock((pkg: string | string[]) => {
      installedPackages.push(...(Array.isArray(pkg) ? pkg : [pkg]));
      return Promise.resolve();
    });

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      select: mock(() => Promise.resolve("oxlint")),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    mock.module("nypm", () => ({
      addDevDependency: mockAddDep,
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      linter: "oxlint",
      pm: "npm",
      skipInstall: false,
      "type-aware": true,
    });

    expect(installedPackages).toContain(
      `oxlint-tsgolint@${OXLINT_TOOLCHAIN_DEV_DEPENDENCIES["oxlint-tsgolint"]}`
    );
  });

  test("completes successfully with minimal options", async () => {
    const mockLog = {
      error: mock(noop),
      info: mock(noop),
      success: mock(noop),
      warn: mock(noop),
    };

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: mockLog,
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      integrations: [],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockLog.success).toHaveBeenCalled();
  });

  test("detects package manager when not provided", async () => {
    const mockDetect = mock(() =>
      Promise.resolve({ name: "pnpm", warnings: [] })
    );
    const mockLog = {
      error: mock(noop),
      info: mock(noop),
      success: mock(noop),
      warn: mock(noop),
    };

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mockDetect,
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: mockLog,
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      integrations: [],
      skipInstall: true,
    });

    expect(mockDetect).toHaveBeenCalled();
    expect(mockLog.info).toHaveBeenCalled();
  });

  test("rejects unsupported explicit package managers before installing", async () => {
    const mockAddDep = mock(() => Promise.resolve());

    mock.module("nypm", () => ({
      addDevDependency: mockAddDep,
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await expect(
      initialize({
        agents: [],
        editors: [],
        frameworks: [],
        hooks: [],
        integrations: [],
        linter: "biome",
        pm: "node",
        quiet: true,
      })
    ).rejects.toThrow('Unknown --pm value "node"');
    expect(mockAddDep).not.toHaveBeenCalled();
  });

  test("rejects unsupported detected package managers before installing", async () => {
    const mockAddDep = mock(() => Promise.resolve());

    mock.module("nypm", () => ({
      addDevDependency: mockAddDep,
      detectPackageManager: mock(() =>
        Promise.resolve({ command: "node", name: "node", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await expect(
      initialize({
        agents: [],
        editors: [],
        frameworks: [],
        hooks: [],
        integrations: [],
        linter: "biome",
        quiet: true,
      })
    ).rejects.toThrow('Unsupported package manager "node"');
    expect(mockAddDep).not.toHaveBeenCalled();
  });

  test("rejects invalid --workspace-framework values before installing", async () => {
    const mockAddDep = mock(() => Promise.resolve());

    mock.module("nypm", () => ({
      addDevDependency: mockAddDep,
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    const result = initialize({
      linter: "oxlint",
      pm: "npm",
      quiet: true,
      "workspace-framework": ["../outside=react"],
    });

    await expect(result).rejects.toBeInstanceOf(UltraciteSetupError);
    await expect(result).rejects.toThrow(
      'Invalid --workspace-framework value "../outside=react"'
    );
    expect(mockAddDep).not.toHaveBeenCalled();
  });

  test("accepts nub as an explicit package manager", async () => {
    const mockAddDep = mock(
      (
        _packages: string[],
        _options: { packageManager: { command: string } }
      ) => Promise.resolve()
    );

    mock.module("nypm", () => ({
      addDevDependency: mockAddDep,
      detectPackageManager: mock(() => Promise.resolve()),
      dlxCommand: mock(() => "nub dlx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      linter: "biome",
      pm: "nub",
      quiet: true,
    });

    expect(mockAddDep).toHaveBeenCalled();
    expect(mockAddDep.mock.calls[0]?.[1].packageManager.command).toBe("nub");
  });

  test("accepts nub when detected from a lockfile", async () => {
    const mockAddDep = mock(
      (
        _packages: string[],
        _options: { packageManager: { command: string } }
      ) => Promise.resolve()
    );

    mock.module("nypm", () => ({
      addDevDependency: mockAddDep,
      detectPackageManager: mock(() =>
        Promise.resolve({ command: "nub", name: "nub", warnings: [] })
      ),
      dlxCommand: mock(() => "nub dlx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      linter: "biome",
      quiet: true,
    });

    expect(mockAddDep).toHaveBeenCalled();
    expect(mockAddDep.mock.calls[0]?.[1].packageManager.command).toBe("nub");
  });

  test("accepts aube as an explicit package manager", async () => {
    const mockAddDep = mock(
      (
        _packages: string[],
        _options: { packageManager: { command: string } }
      ) => Promise.resolve()
    );

    mock.module("nypm", () => ({
      addDevDependency: mockAddDep,
      detectPackageManager: mock(() => Promise.resolve()),
      dlxCommand: mock(() => "aube dlx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      linter: "biome",
      pm: "aube",
      quiet: true,
    });

    expect(mockAddDep).toHaveBeenCalled();
    expect(mockAddDep.mock.calls[0]?.[1].packageManager.command).toBe("aube");
  });

  test("installs dependencies when skipInstall is false", async () => {
    const mockAddDep = mock(() => Promise.resolve());

    mock.module("nypm", () => ({
      addDevDependency: mockAddDep,
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      integrations: [],
      pm: "npm",
      skipInstall: false,
    });

    expect(mockAddDep).toHaveBeenCalled();
  });

  test("creates editor configs when specified", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: ["vscode", "zed"],
      frameworks: [],
      integrations: [],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("creates agent configs when specified", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: ["claude", "cline"],
      editors: [],
      frameworks: [],
      integrations: [],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("supports --editors universal as a .vscode/settings.json alias", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: ["universal", "vscode"],
      frameworks: [],
      integrations: [],
      pm: "npm",
      skipInstall: true,
    });

    const editorWrites = mockWriteFile.mock.calls.filter(
      (call) => call[0] === ".vscode/settings.json"
    );

    expect(editorWrites).toHaveLength(1);
  });

  test("supports --agents universal as an AGENTS.md alias", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: ["universal", "codex"],
      editors: [],
      frameworks: [],
      integrations: [],
      pm: "npm",
      skipInstall: true,
    });

    const agentWrites = mockWriteFile.mock.calls.filter(
      (call) => call[0] === "AGENTS.md"
    );

    expect(agentWrites).toHaveLength(1);
  });

  test("prompts to install the Ultracite skill after initialization", async () => {
    const mockSelect = mock(() => Promise.resolve("skip"));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      select: mockSelect,
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    // --linter alone leaves init interactive, so it would ask about the skill.
    await initialize({ linter: "biome", skipInstall: true });

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Do you want to install the Ultracite skill?",
        options: [
          expect.objectContaining({
            label: "Yes, install it",
            value: "install",
          }),
          expect.objectContaining({
            label: "No, I'll do it later",
            value: "skip",
          }),
        ],
      })
    );
  });

  test("skips the skill prompt when the Ultracite skill is installed globally", async () => {
    const mockInfo = mock(noop);
    const mockSelect = mock(() => Promise.resolve("skip"));
    const mockSpawn = mock((_command: string, args: string[]) => {
      if (args[1] === "list" && !args.includes("-g")) {
        return { status: 0, stdout: "[]" };
      }

      if (args[1] === "list" && args.includes("-g")) {
        return {
          status: 0,
          stdout: JSON.stringify([
            {
              agents: ["Claude Code"],
              name: "ultracite",
              path: "/Users/test/.claude/skills/ultracite",
              scope: "global",
            },
          ]),
        };
      }

      return { status: 0, stdout: "[]" };
    });

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(
        (_pm: string, pkg: string, options?: { args?: string[] }) =>
          pkg === "skills"
            ? `npx skills ${options?.args?.join(" ") ?? ""}`.trim()
            : "npx ultracite fix"
      ),
      removeDependency: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mockInfo,
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      select: mockSelect,
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    // --linter alone leaves init interactive, so it would ask about the skill.
    await initialize({ linter: "biome", skipInstall: true });

    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockSpawn).toHaveBeenCalledWith(
      "npx",
      ["skills", "list", "--json"],
      expect.objectContaining({
        stdio: "pipe",
      })
    );
    expect(mockSpawn).toHaveBeenCalledWith(
      "npx",
      ["skills", "list", "-g", "--json"],
      expect.objectContaining({
        stdio: "pipe",
      })
    );
    expect(mockSpawn).not.toHaveBeenCalledWith(
      "npx",
      ["skills", "add", "haydenbleasel/ultracite"],
      expect.anything()
    );
    expect(mockInfo).not.toHaveBeenCalledWith(
      expect.stringContaining("You can install the Ultracite skill later")
    );
  });

  test("skips the skill prompt when the Ultracite skill is installed locally", async () => {
    const mockInfo = mock(noop);
    const mockSelect = mock(() => Promise.resolve("skip"));
    const mockSpawn = mock((_command: string, args: string[]) => {
      if (args[1] === "list" && !args.includes("-g")) {
        return {
          status: 0,
          stdout: JSON.stringify([
            {
              agents: ["Claude Code"],
              name: "ultracite",
              path: "/repo/.claude/skills/ultracite",
              scope: "project",
            },
          ]),
        };
      }

      return { status: 0, stdout: "[]" };
    });

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(
        (_pm: string, pkg: string, options?: { args?: string[] }) =>
          pkg === "skills"
            ? `npx skills ${options?.args?.join(" ") ?? ""}`.trim()
            : "npx ultracite fix"
      ),
      removeDependency: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mockInfo,
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      select: mockSelect,
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    // --linter alone leaves init interactive, so it would ask about the skill.
    await initialize({ linter: "biome", skipInstall: true });

    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockSpawn).toHaveBeenCalledWith(
      "npx",
      ["skills", "list", "--json"],
      expect.objectContaining({
        stdio: "pipe",
      })
    );
    expect(mockSpawn).not.toHaveBeenCalledWith(
      "npx",
      ["skills", "list", "-g", "--json"],
      expect.anything()
    );
    expect(mockInfo).not.toHaveBeenCalledWith(
      expect.stringContaining("You can install the Ultracite skill later")
    );
  });

  test("installs the Ultracite skill when requested", async () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    const mockSelect = mock(() => Promise.resolve("skip"));

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock((_pm: string, pkg: string) =>
        pkg === "skills"
          ? "npx skills add haydenbleasel/ultracite"
          : "npx ultracite fix"
      ),
      removeDependency: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      select: mockSelect,
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      installSkill: true,
      integrations: [],
      linter: "biome",
      pm: "npm",
      skipInstall: true,
    });

    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockSpawn).toHaveBeenCalledWith(
      "npx",
      ["skills", "add", "haydenbleasel/ultracite"],
      expect.objectContaining({
        stdio: "pipe",
      })
    );
  });

  test("skips the skill prompt when every question is answered by a flag", async () => {
    const mockSelect = mock(() => Promise.resolve("install"));
    const mockSpawn = mock(() => ({ status: 0 }));

    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      select: mockSelect,
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      linter: "biome",
      pm: "npm",
      quiet: true,
      skipInstall: true,
    });

    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test("sets up integrations when specified", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      integrations: ["husky", "lint-staged"],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("updates husky when hook already exists", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      // Access resolves for pre-commit hook (exists check)
      access: mock((path: string) => {
        if (path === "./.husky/pre-commit") {
          return Promise.resolve();
        }
        return Promise.reject(new Error("ENOENT"));
      }),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock((path: string) => {
        if (path === "./.husky/pre-commit") {
          return Promise.resolve('#!/bin/sh\necho "existing"');
        }
        return Promise.resolve('{"name": "test"}');
      }),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: ["husky"],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("sets up hooks when specified", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: ["cursor", "windsurf", "codebuddy", "claude"],
      integrations: [],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("sets up lefthook integration when specified", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: ["lefthook"],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("sets up pre-commit integration when specified", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: ["pre-commit"],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("shows warnings when package manager detected with warnings", async () => {
    const mockLog = {
      error: mock(noop),
      info: mock(noop),
      success: mock(noop),
      warn: mock(noop),
    };

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({
          name: "npm",
          warnings: ["Some warning about lockfile"],
        })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: mockLog,
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      skipInstall: true,
    });

    expect(mockLog.warn).toHaveBeenCalled();
  });

  test("throws error when no package manager detected", async () => {
    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() => Promise.resolve(null)),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: {
        error: mock(noop),
        info: mock(noop),
        success: mock(noop),
        warn: mock(noop),
      },
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    await expect(async () => {
      await initialize({
        agents: [],
        editors: [],
        frameworks: [],
        hooks: [],
        integrations: [],
        skipInstall: true,
      });
    }).toThrow("No package manager detected");
  });

  test("exits with error on failure", async () => {
    const mockLog = {
      error: mock(noop),
      info: mock(noop),
      success: mock(noop),
      warn: mock(noop),
    };

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
      confirm: mock(() => Promise.resolve(false)),
      intro: mock(noop),
      isCancel: mock(() => false),
      log: mockLog,
      multiselect: mock(() => Promise.resolve([])),
      outro: mock(noop),
      spinner: mock(() => ({
        message: mock(noop),
        start: mock(noop),
        stop: mock(noop),
      })),
    }));

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.reject(new Error("Install failed"))),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await expect(async () => {
      await initialize({
        agents: [],
        editors: [],
        frameworks: [],
        integrations: [],
        pm: "npm",
        skipInstall: false,
      });
    }).toThrow("Install failed");

    expect(mockLog.error).toHaveBeenCalled();
  });
});

describe("helper functions", () => {
  // Note: We don't call mock.restore() here because it causes issues
  // with module re-loading when the tests transition between each other

  describe("installDependencies", () => {
    test("keeps a project's own check script and adds the missing fix script", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      const warn = mock((_message: string) => {});

      mock.module("node:fs/promises", () => ({
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve(
            JSON.stringify({
              name: "app",
              scripts: { check: "tsc --noEmit && vitest run" },
            })
          )
        ),
        writeFile: mockWriteFile,
      }));
      mock.module("@clack/prompts", () => ({
        log: { info: mock(noop), warn },
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "oxlint", false, false);

      const packageJson = JSON.parse(
        mockWriteFile.mock.calls.at(-1)?.[1] ?? ""
      );
      expect(packageJson.scripts).toEqual({
        check: "tsc --noEmit && vitest run",
        fix: "ultracite fix",
      });
      expect(warn.mock.calls[0]?.[0]).toContain(
        'package.json already has a "check" script'
      );
    });

    test("leaves Ultracite scripts with extra flags alone without warning", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      const warn = mock((_message: string) => {});

      mock.module("node:fs/promises", () => ({
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve(
            JSON.stringify({
              name: "app",
              scripts: {
                check: "ultracite check --type-aware",
                fix: "ultracite fix --type-aware",
              },
            })
          )
        ),
        writeFile: mockWriteFile,
      }));
      mock.module("@clack/prompts", () => ({
        log: { info: mock(noop), warn },
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "oxlint", false, false);

      const packageJson = JSON.parse(
        mockWriteFile.mock.calls.at(-1)?.[1] ?? ""
      );
      expect(packageJson.scripts).toEqual({
        check: "ultracite check --type-aware",
        fix: "ultracite fix --type-aware",
      });
      expect(warn).not.toHaveBeenCalled();
    });

    test("installs dependencies when install is true", async () => {
      const mockAddDep = mock(() => Promise.resolve());
      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "biome", true);
      expect(mockAddDep).toHaveBeenCalled();
    });

    test("updates package.json when install is false", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"name": "test"}')),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "biome", false);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("installs eslint dependencies when linter is eslint", async () => {
      const installedPackages: string[] = [];
      const mockAddDep = mock((pkg: string | string[]) => {
        installedPackages.push(...(Array.isArray(pkg) ? pkg : [pkg]));
        return Promise.resolve();
      });

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "eslint", true);
      expect(mockAddDep).toHaveBeenCalled();
      expect(installedPackages).toContain("eslint@^10.9.0");
      expect(installedPackages).toContain("@eslint/js@^10.0.1");
      expect(installedPackages).toContain("eslint-plugin-github@6.1.2");
      expect(installedPackages).not.toContain("eslint@latest");
    });

    test("installs oxlint dependencies when linter is oxlint", async () => {
      const mockAddDep = mock(() => Promise.resolve());

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "oxlint", true);
      expect(mockAddDep).toHaveBeenCalled();
    });

    test("updates package.json with eslint deps when install is false", async () => {
      const writtenContents: string[] = [];
      const mockWriteFile = mock((_path: string, content: string) => {
        writtenContents.push(content);
        return Promise.resolve();
      });
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"name": "test"}')),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "eslint", false);
      expect(mockWriteFile).toHaveBeenCalled();
      expect(
        writtenContents.some((content) =>
          content.includes('"eslint": "^10.9.0"')
        )
      ).toBe(true);
      expect(
        writtenContents.some((content) =>
          content.includes('"eslint-plugin-github": "6.1.2"')
        )
      ).toBe(true);
    });

    test("overrides the eslint peer of plugins behind ESLint 10, on npm only", async () => {
      const written: string[] = [];
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"name": "test"}')),
        writeFile: mock((_path: string, content: string) => {
          written.push(content);
          return Promise.resolve();
        }),
      }));
      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "eslint", false, true, false, ["react"]);

      const withOverrides = written.find((content) =>
        content.includes('"overrides"')
      );
      expect(JSON.parse(withOverrides ?? "{}").overrides).toEqual({
        "eslint-plugin-jsx-a11y": { eslint: "$eslint" },
        "eslint-plugin-react": { eslint: "$eslint" },
      });

      written.length = 0;
      const pnpmPm: PackageManager = { command: "pnpm", name: "pnpm" };
      await installDependencies(pnpmPm, "eslint", false, true, false, [
        "react",
      ]);

      expect(written.some((content) => content.includes('"overrides"'))).toBe(
        false
      );
    });

    test("updates package.json with oxlint deps when install is false", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"name": "test"}')),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "oxlint", false);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("installs oxlint-tsgolint when type-aware is true", async () => {
      const installedPackages: string[] = [];
      const mockAddDep = mock((pkg: string | string[]) => {
        installedPackages.push(...(Array.isArray(pkg) ? pkg : [pkg]));
        return Promise.resolve();
      });

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "oxlint", true, true, true);
      expect(installedPackages).toContain(
        `oxlint-tsgolint@${OXLINT_TOOLCHAIN_DEV_DEPENDENCIES["oxlint-tsgolint"]}`
      );
    });

    test("does not install oxlint-tsgolint when type-aware is false", async () => {
      const installedPackages: string[] = [];
      const mockAddDep = mock((pkg: string) => {
        installedPackages.push(pkg);
        return Promise.resolve();
      });

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "oxlint", true, true, false);
      expect(installedPackages).not.toContain(
        `oxlint-tsgolint@${OXLINT_TOOLCHAIN_DEV_DEPENDENCIES["oxlint-tsgolint"]}`
      );
    });

    test("updates package.json with oxlint-tsgolint when type-aware and install is false", async () => {
      const writtenContents: string[] = [];
      const mockWriteFile = mock((_path: string, content: string) => {
        writtenContents.push(content);
        return Promise.resolve();
      });

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"name": "test"}')),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "oxlint", false, true, true);
      expect(mockWriteFile).toHaveBeenCalled();
      expect(writtenContents.some((c) => c.includes("oxlint-tsgolint"))).toBe(
        true
      );
    });

    test("does not pass workspace flag to npm in a monorepo", async () => {
      // Regression: npm's `--workspaces` installs in every workspace package,
      // so passing it for a root dev-dep install fails with
      // "No workspaces found!" when patterns match nothing. See issues #214,
      // #241 and a 2026-05 report against 7.6.4.
      const calls: { workspace: boolean | string }[] = [];
      const mockAddDep = mock(
        (_pkg: string | string[], opts: { workspace: boolean | string }) => {
          calls.push({ workspace: opts.workspace });
          return Promise.resolve();
        }
      );

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => '{"workspaces": ["packages/*"]}'),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(npmPm, "biome", true);

      expect(mockAddDep).toHaveBeenCalled();
      expect(calls.every((c) => c.workspace === false)).toBe(true);
    });

    test("passes workspace flag to pnpm in a monorepo", async () => {
      const pnpmPm: PackageManager = { command: "pnpm", name: "pnpm" };
      const calls: { workspace: boolean | string }[] = [];
      const mockAddDep = mock(
        (_pkg: string | string[], opts: { workspace: boolean | string }) => {
          calls.push({ workspace: opts.workspace });
          return Promise.resolve();
        }
      );

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => '{"workspaces": ["packages/*"]}'),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "pnpm", warnings: [] })
        ),
        dlxCommand: mock(() => "pnpm dlx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(pnpmPm, "biome", true);

      expect(mockAddDep).toHaveBeenCalled();
      expect(calls.some((c) => c.workspace === true)).toBe(true);
    });

    test("installs at the workspace root with nub in a monorepo", async () => {
      // nub refuses root installs without `--workspace-root`, which nypm
      // passes for nub (as for pnpm and aube) when `workspace` is set.
      const nubPm: PackageManager = { command: "nub", name: "nub" };
      const calls: { packageManager: PackageManager; workspace: boolean }[] =
        [];
      const mockAddDep = mock(
        (
          _pkg: string | string[],
          opts: { packageManager: PackageManager; workspace: boolean }
        ) => {
          calls.push({
            packageManager: opts.packageManager,
            workspace: opts.workspace,
          });
          return Promise.resolve();
        }
      );

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => '{"workspaces": ["packages/*"]}'),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "nub", warnings: [] })
        ),
        dlxCommand: mock(() => "nub dlx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await installDependencies(nubPm, "biome", true);

      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0]?.workspace).toBe(true);
      expect(calls[0]?.packageManager).toEqual({
        command: "nub",
        name: "nub",
      });
    });
  });

  describe("migrateLinterConfig", () => {
    test("removes stale Biome and ESLint config when migrating to oxlint", async () => {
      const removedFiles: string[] = [];
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (
            [
              "./biome.jsonc",
              "./eslint.config.mjs",
              "./prettier.config.mjs",
              "./stylelint.config.mjs",
            ].includes(path)
          ) {
            return;
          }
          throw new Error("ENOENT");
        }),
        lstatSync: mock(() => ({ isSymbolicLink: () => false })),
        mkdirSync: mock(() => {}),
        realpathSync: mock((path: string) => path),
      }));

      mock.module("node:fs/promises", () => ({
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve(
            JSON.stringify({
              devDependencies: {
                "@biomejs/biome": "latest",
                eslint: "latest",
                oxfmt: "latest",
                oxlint: "latest",
                prettier: "latest",
                stylelint: "latest",
                ultracite: "latest",
              },
              prettier: {},
              stylelint: {},
            })
          )
        ),
        rm: mock((path: string) => {
          removedFiles.push(path);
          return Promise.resolve();
        }),
        writeFile: mockWriteFile,
      }));

      await migrateLinterConfig("oxlint", true);

      expect(removedFiles).toContain("./biome.jsonc");
      expect(removedFiles).toContain("./eslint.config.mjs");
      expect(removedFiles).toContain("./prettier.config.mjs");
      expect(removedFiles).toContain("./stylelint.config.mjs");
      expect(removedFiles).not.toContain("./oxlint.config.ts");
      expect(removedFiles).not.toContain("./oxfmt.config.ts");

      const packageJson = JSON.parse(
        mockWriteFile.mock.calls.at(-1)?.[1] ?? ""
      );
      expect(packageJson.devDependencies).toEqual({
        oxfmt: "latest",
        oxlint: "latest",
        ultracite: "latest",
      });
      expect(packageJson.prettier).toBeUndefined();
      expect(packageJson.stylelint).toBeUndefined();
    });

    test("keeps eslint-plugin-tsdoc when moving to ESLint", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mockFileSystem({});
      mock.module("node:fs/promises", () => ({
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve(
            JSON.stringify({
              devDependencies: {
                eslint: "latest",
                "eslint-plugin-tsdoc": "latest",
                oxlint: "latest",
                "oxlint-plugin-react-doctor": "latest",
              },
            })
          )
        ),
        rm: mock(() => Promise.resolve()),
        writeFile: mockWriteFile,
      }));

      try {
        await migrateLinterConfig("eslint", true);
      } finally {
        restoreFileSystemMock();
      }

      const packageJson = JSON.parse(
        mockWriteFile.mock.calls.at(-1)?.[1] ?? ""
      );
      // An ESLint config can load eslint-plugin-tsdoc too, so only the
      // Oxlint-only packages are pruned.
      expect(packageJson.devDependencies).toEqual({
        eslint: "latest",
        "eslint-plugin-tsdoc": "latest",
      });
    });

    test("prunes other linters from devDependencies only, keeping key order", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mockFileSystem({});
      mock.module("node:fs/promises", () => ({
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve(
            `{
	"name": "plugin",
	"version": "1.0.0",
	"dependencies": { "prettier": "^3.0.0", "globals": "^15.0.0" },
	"peerDependencies": { "eslint": ">=9" },
	"devDependencies": { "eslint": "^10.0.0", "typescript": "^5.0.0" },
	"main": "index.js"
}
`
          )
        ),
        rm: mock(() => Promise.resolve()),
        writeFile: mockWriteFile,
      }));

      try {
        await migrateLinterConfig("oxlint", true);
      } finally {
        restoreFileSystemMock();
      }

      const written = mockWriteFile.mock.calls.at(-1)?.[1] ?? "";
      const packageJson = JSON.parse(written);
      expect(Object.keys(packageJson)).toEqual([
        "name",
        "version",
        "dependencies",
        "peerDependencies",
        "devDependencies",
        "main",
      ]);
      expect(packageJson.dependencies).toEqual({
        globals: "^15.0.0",
        prettier: "^3.0.0",
      });
      expect(packageJson.peerDependencies).toEqual({ eslint: ">=9" });
      expect(packageJson.devDependencies).toEqual({ typescript: "^5.0.0" });
      expect(written).toStartWith('{\n\t"name": "plugin",');
    });

    test("leaves package.json Prettier and Stylelint configs to their writers on ESLint", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mockFileSystem({});
      mock.module("node:fs/promises", () => ({
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve(
            '{"name": "app", "prettier": "ultracite/prettier", "stylelint": {"extends": "ultracite/stylelint"}}'
          )
        ),
        rm: mock(() => Promise.resolve()),
        writeFile: mockWriteFile,
      }));

      try {
        await migrateLinterConfig("eslint", true);
      } finally {
        restoreFileSystemMock();
      }

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("removes stale Oxlint config when migrating to biome", async () => {
      const removedFiles: string[] = [];
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (["./oxlint.config.ts", "./oxfmt.config.ts"].includes(path)) {
            return;
          }
          throw new Error("ENOENT");
        }),
        lstatSync: mock(() => ({ isSymbolicLink: () => false })),
        mkdirSync: mock(() => {}),
        realpathSync: mock((path: string) => path),
      }));

      mock.module("node:fs/promises", () => ({
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve(
            JSON.stringify({
              devDependencies: {
                "@biomejs/biome": "latest",
                oxfmt: "latest",
                oxlint: "latest",
                ultracite: "latest",
              },
            })
          )
        ),
        rm: mock((path: string) => {
          removedFiles.push(path);
          return Promise.resolve();
        }),
        writeFile: mockWriteFile,
      }));

      await migrateLinterConfig("biome", true);

      expect(removedFiles).toContain("./oxlint.config.ts");
      expect(removedFiles).toContain("./oxfmt.config.ts");
      expect(removedFiles).not.toContain("./biome.jsonc");

      const packageJson = JSON.parse(
        mockWriteFile.mock.calls.at(-1)?.[1] ?? ""
      );
      expect(packageJson.devDependencies).toEqual({
        "@biomejs/biome": "latest",
        ultracite: "latest",
      });
    });
  });

  describe("upsertTsConfig", () => {
    test("updates existing tsconfig", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./tsconfig.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"compilerOptions": {}}')),
        writeFile: mockWriteFile,
      }));

      mock.module("fast-glob", () => ({
        default: mock(() => Promise.resolve(["./tsconfig.json"])),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertTsConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("skips when no tsconfig found", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("fast-glob", () => ({
        default: mock(() => Promise.resolve([])),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertTsConfig();
    });
  });

  describe("upsertEditorConfig", () => {
    test("throws error for invalid editor id", async () => {
      await expect(async () => {
        await upsertEditorConfig("invalid-editor");
      }).toThrow('Editor "invalid-editor" not found');
    });

    test("installs the Prettier extension too for the ESLint toolchain", async () => {
      const mockSpawn = mock((_command: string, _args: string[]) => ({
        status: 0,
      }));
      mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));
      mock.module("node:fs/promises", () => ({
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));
      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));
      restoreFileSystemMock();

      await upsertEditorConfig("vscode", "eslint");

      expect(mockSpawn.mock.calls.map(([, args]) => args.at(-1))).toEqual([
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
      ]);
    });

    test("creates vscode settings when not exists", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertEditorConfig("vscode");
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test.each([
      ["oxlint", "Install the Oxc extension: https://zed.dev/extensions/oxc"],
      [
        "biome",
        "Install the Biome extension: https://biomejs.dev/reference/zed/",
      ],
    ] as const)(
      "points to the Zed extension %s needs",
      async (linter, hint) => {
        const stop = mock((_message: string) => {});
        mock.module("node:fs/promises", () => ({
          access: mock(() => Promise.reject(new Error("ENOENT"))),
          mkdir: mock(() => Promise.resolve()),
          readFile: mock(() => Promise.resolve("{}")),
          writeFile: mock(() => Promise.resolve()),
        }));
        mock.module("@clack/prompts", () => ({
          spinner: mock(() => ({
            message: mock(noop),
            start: mock(noop),
            stop,
          })),
        }));

        await upsertEditorConfig("zed", linter);

        expect(stop.mock.calls.at(-1)?.[0]).toBe(
          `.zed/settings.json created. ${hint}`
        );
      }
    );

    test("updates existing vscode settings", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".vscode/settings.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"editor.tabSize": 2}')),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertEditorConfig("vscode");
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("handles vscode extension install error gracefully", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      // Mock extension install failing to spawn
      mock.module("../src/spawn-sync", () => ({
        spawnSync: mock(() => ({
          error: new Error("Extension install failed"),
          status: null,
        })),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      // Should not throw, just continue
      await upsertEditorConfig("vscode");
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("creates zed settings when not exists", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertEditorConfig("zed");
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing zed settings", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".zed/settings.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"theme": "dark"}')),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertEditorConfig("zed");
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertBiomeConfig", () => {
    test("creates biome config with frameworks", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertBiomeConfig(["react"]);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing biome config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve('{"extends": ["ultracite/biome/core"]}')
        ),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertBiomeConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertEslintConfig", () => {
    test("creates eslint config with frameworks", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertEslintConfig(["react"]);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing eslint config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./eslint.config.mjs") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("export default [];")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertEslintConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertOxlintConfig", () => {
    test("creates oxlint config with frameworks", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertOxlintConfig(["react"]);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing oxlint config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxlint.config.ts") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve(
            'import { defineConfig } from "oxlint";\n\nexport default defineConfig({ extends: [] });\n'
          )
        ),
        writeFile: mockWriteFile,
      }));
      mockFileSystem({ "./oxlint.config.ts": "" });

      mock.module("@clack/prompts", () => ({
        log: { info: mock(noop), warn: mock(noop) },
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      try {
        await upsertOxlintConfig();
      } finally {
        restoreFileSystemMock();
      }
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertPrettierConfig", () => {
    test("creates prettier config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertPrettierConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing prettier config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./prettier.config.mjs") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("export default {};")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertPrettierConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertStylelintConfig", () => {
    test("creates stylelint config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertStylelintConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing stylelint config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./stylelint.config.mjs") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("export default {};")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertStylelintConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertOxfmtConfig", () => {
    test("creates oxfmt config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertOxfmtConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing oxfmt config when file exists", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertOxfmtConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertHooks", () => {
    test("creates hooks for cursor", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertHooks("cursor", "npm");
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing hooks", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".cursor/hooks.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertHooks("cursor", "npm");
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("initializePreCommit", () => {
    test("creates pre-commit config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await initializePreCommit("npm", true);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing pre-commit config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.pre-commit-config.yaml") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("repos: []")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await initializePreCommit("npm", false);
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("initializePrecommitHook", () => {
    test("keeps an existing prepare script when skipping the install", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        mkdir: mock(() => Promise.resolve()),
        readFile: mock((filePath: string) =>
          String(filePath).includes("package.json")
            ? Promise.resolve(
                '{"name": "app", "scripts": {"prepare": "svelte-kit sync"}}'
              )
            : Promise.reject(new Error("ENOENT"))
        ),
        writeFile: mockWriteFile,
      }));
      mock.module("@clack/prompts", () => ({
        log: { info: mock(noop), warn: mock(noop) },
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));
      restoreFileSystemMock();

      await initializePrecommitHook(npmPm, false, true);

      const packageJson = JSON.parse(
        mockWriteFile.mock.calls.find(
          ([filePath]) => filePath === "package.json"
        )?.[1] ?? "{}"
      );
      expect(packageJson.scripts.prepare).toBe("svelte-kit sync && husky");
      expect(packageJson.devDependencies).toEqual({ husky: "latest" });
    });

    test("installs and creates husky hook", async () => {
      const mockAddDep = mock(() => Promise.resolve());
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await initializePrecommitHook(npmPm, true);
      expect(mockAddDep).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing husky hook", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".husky/pre-commit") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock((path: string) => {
          if (path === "package.json") {
            return Promise.resolve('{"name": "test", "devDependencies": {}}');
          }
          return Promise.resolve("#!/bin/sh\necho test");
        }),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await initializePrecommitHook(npmPm, false);
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("initializeLefthook", () => {
    test("names the lefthook config file the project actually uses", async () => {
      const messages: string[] = [];
      const record = (message: string) => {
        messages.push(message);
      };

      mock.module("node:fs/promises", () => ({
        mkdir: mock(() => Promise.resolve()),
        readFile: mock((filePath: string) =>
          Promise.resolve(
            String(filePath).includes("package.json")
              ? '{"name": "app"}'
              : "pre-commit:\n  jobs:\n    - run: echo hi\n"
          )
        ),
        writeFile: mock(() => Promise.resolve()),
      }));
      mock.module("@clack/prompts", () => ({
        log: { info: mock(noop), warn: mock(noop) },
        spinner: mock(() => ({
          message: mock(record),
          start: mock(noop),
          stop: mock(record),
        })),
      }));
      mockFileSystem({ "./.lefthook.yaml": "" });

      try {
        await initializeLefthook(npmPm, false);
      } finally {
        restoreFileSystemMock();
      }

      expect(messages).toContain(".lefthook.yaml found, updating...");
      expect(messages).toContain(".lefthook.yaml updated.");
      expect(messages.join("\n")).not.toContain("lefthook.yml");
    });

    test("creates lefthook config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      const mockAddDep = mock(() => Promise.resolve());

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await initializeLefthook(npmPm, true);
      expect(mockAddDep).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing lefthook config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./lefthook.yml") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock((path: string) => {
          if (path === "package.json") {
            return Promise.resolve('{"name": "test"}');
          }
          return Promise.resolve(
            "pre-commit:\n  commands:\n    test:\n      run: echo test"
          );
        }),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await initializeLefthook(npmPm, false);
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("initializeLintStaged", () => {
    test("creates lint-staged config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      const mockAddDep = mock(() => Promise.resolve());

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await initializeLintStaged(npmPm, true);
      expect(mockAddDep).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing lint-staged config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.lintstagedrc.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock((path: string) => {
          if (path === "package.json") {
            return Promise.resolve('{"name": "test"}');
          }
          return Promise.resolve('{"*.js": ["eslint"]}');
        }),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await initializeLintStaged(npmPm, false);
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertAgents", () => {
    test("writes AGENTS.md for the selected agents", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertAgents(["claude", "codex"], "npm", "biome");

      expect(mockWriteFile.mock.calls.map((call) => call[0])).toEqual([
        "AGENTS.md",
      ]);
    });
  });

  describe("interactive prompts", () => {
    test("cancels when user cancels linter prompt in fully interactive mode", async () => {
      expectStoppedBeforeSetup(
        await runCancelledInit("linter", { skipInstall: true })
      );
    });

    test("cancels when user cancels frameworks prompt in fully interactive mode", async () => {
      expectStoppedBeforeSetup(
        await runCancelledInit("frameworks", { skipInstall: true })
      );
    });

    test("cancels when user cancels JS plugins prompt in fully interactive mode", async () => {
      expectStoppedBeforeSetup(
        await runCancelledInit("JS plugins", { skipInstall: true })
      );
    });

    test("cancels when user cancels hooks prompt in fully interactive mode", async () => {
      expectStoppedBeforeSetup(
        await runCancelledInit("agent hooks", { skipInstall: true })
      );
    });

    test("cancels when user cancels integrations prompt in fully interactive mode", async () => {
      expectStoppedBeforeSetup(
        await runCancelledInit("Would you like any of the following", {
          skipInstall: true,
        })
      );
    });

    test("takes the defaults with --yes without prompting", async () => {
      const mockMultiselect = mock(() => Promise.resolve([]));

      mock.module("@clack/prompts", () => ({
        cancel: mock(noop),
        confirm: mock(() => Promise.resolve(false)),
        intro: mock(noop),
        isCancel: mock(() => false),
        log: {
          error: mock(noop),
          info: mock(noop),
          success: mock(noop),
          warn: mock(noop),
        },
        multiselect: mockMultiselect,
        outro: mock(noop),
        select: mock(() => Promise.resolve("biome")),
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await initialize({
        skipInstall: true,
        yes: true,
      });

      // No prompt for linter/frameworks/editors/agents/hooks/integrations
      expect(mockMultiselect).not.toHaveBeenCalled();
    });

    test("defaults to oxlint with --yes when no linter is given", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"name": "test"}')),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        cancel: mock(noop),
        confirm: mock(() => Promise.resolve(false)),
        intro: mock(noop),
        isCancel: mock(() => false),
        log: {
          error: mock(noop),
          info: mock(noop),
          success: mock(noop),
          warn: mock(noop),
        },
        multiselect: mock(() => Promise.resolve([])),
        outro: mock(noop),
        select: mock(() => Promise.resolve("biome")),
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      restoreFileSystemMock();
      await initialize({
        pm: "npm",
        skipInstall: true,
        yes: true,
      });

      const writtenPaths = mockWriteFile.mock.calls.map(([path]) =>
        String(path)
      );

      // No "type": "module" in package.json, so the config is .mts.
      expect(writtenPaths.some((p) => p.endsWith("oxlint.config.mts"))).toBe(
        true
      );
      expect(writtenPaths.some((p) => p.endsWith("biome.jsonc"))).toBe(false);
    });
  });
});

const quietPrompts = () => ({
  cancel: mock(noop),
  confirm: mock(() => Promise.resolve(false)),
  intro: mock(noop),
  isCancel: mock(() => false),
  log: {
    error: mock(noop),
    info: mock(noop),
    success: mock(noop),
    warn: mock(noop),
  },
  multiselect: mock(() => Promise.resolve([])),
  outro: mock(noop),
  select: mock(() => Promise.resolve("biome")),
  spinner: mock(() => ({
    message: mock(noop),
    start: mock(noop),
    stop: mock(noop),
  })),
});

describe("init flag validation", () => {
  test("rejects an unknown --linter before touching the project", async () => {
    const mockAddDep = mock(() => Promise.resolve());
    const mockRm = mock(() => Promise.resolve());
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      rm: mockRm,
      writeFile: mockWriteFile,
    }));
    mock.module("@clack/prompts", quietPrompts);
    mock.module("nypm", () => ({
      addDevDependency: mockAddDep,
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
    }));

    const flags: Parameters<typeof initialize>[0] = { pm: "npm", quiet: true };
    // Commander passes flag values through unchecked, so plant a value
    // outside the Linter union the way a mistyped flag arrives.
    Reflect.set(flags ?? {}, "linter", "Biome");
    const result = initialize(flags);

    await expect(result).rejects.toBeInstanceOf(UltraciteSetupError);
    await expect(result).rejects.toThrow(
      'Unknown --linter value "Biome". Valid values: biome, eslint, oxlint.'
    );
    expect(mockAddDep).not.toHaveBeenCalled();
    expect(mockRm).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  test("rejects unknown values for every list flag", () => {
    const cases: [Parameters<typeof validateInitializeFlags>[0], string][] = [
      [
        { frameworks: ["react", "nextjs"] },
        'Unknown --frameworks value "nextjs"',
      ],
      [{ editors: ["vsc"] }, 'Unknown --editors value "vsc"'],
      [
        { agents: ["claude-code", "x"] },
        'Unknown --agents values "claude-code", "x"',
      ],
      [{ hooks: ["vim"] }, 'Unknown --hooks value "vim"'],
      [
        { integrations: ["simple-git-hooks"] },
        'Unknown --integrations value "simple-git-hooks"',
      ],
      [
        { "js-plugins": ["eslint-plugin-foo"] },
        'Unknown --js-plugins value "eslint-plugin-foo"',
      ],
      [{ pm: "pip" }, 'Unknown --pm value "pip"'],
    ];

    for (const [flags, message] of cases) {
      expect(() => validateInitializeFlags(flags)).toThrow(message);
    }
  });

  test("accepts known values, including universal editors and agents", () => {
    expect(() =>
      validateInitializeFlags({
        agents: ["universal", "claude"],
        editors: ["universal", "zed"],
        frameworks: ["react", "next"],
        hooks: ["cursor"],
        integrations: ["husky", "lint-staged"],
        "js-plugins": ["anti-slop"],
        linter: "oxlint",
        pm: "bun",
      })
    ).not.toThrow();
  });

  test("rejects --js-plugins with a linter other than Oxlint", () => {
    for (const linter of ["biome", "eslint"]) {
      expect(() =>
        validateInitializeFlags({ "js-plugins": ["anti-slop"], linter })
      ).toThrow(
        `--js-plugins only works with Oxlint, but the linter is "${linter}". Pass --linter oxlint to use JS plugins.`
      );
    }
  });

  test("rejects --js-plugins on a project that keeps another linter", async () => {
    const mockSelect = mock(() => Promise.resolve("biome"));
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      rm: mock(() => Promise.resolve()),
      writeFile: mockWriteFile,
    }));
    mock.module("@clack/prompts", () => ({
      ...quietPrompts(),
      select: mockSelect,
    }));
    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
    }));
    mockDetectLinter.mockImplementation(() => "biome");

    try {
      const result = initialize({
        "js-plugins": ["anti-slop"],
        skipInstall: true,
      });

      await expect(result).rejects.toBeInstanceOf(UltraciteSetupError);
      await expect(result).rejects.toThrow(
        '--js-plugins only works with Oxlint, but the linter is "biome".'
      );
    } finally {
      mockDetectLinter.mockImplementation(() => null);
    }

    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  test("uses Oxlint for --js-plugins without asking for a linter", async () => {
    const mockSelect = mock(() => Promise.resolve("biome"));
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      rm: mock(() => Promise.resolve()),
      writeFile: mockWriteFile,
    }));
    mock.module("@clack/prompts", () => ({
      ...quietPrompts(),
      select: mockSelect,
    }));
    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
    }));

    restoreFileSystemMock();
    await initialize({ "js-plugins": ["anti-slop"], skipInstall: true });

    expect(mockSelect).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: "Which linter do you want to use?" })
    );
    expect(
      mockWriteFile.mock.calls.some(
        ([filePath, content]) =>
          String(filePath).endsWith("oxlint.config.mts") &&
          content.includes('"ultracite/oxlint/anti-slop"')
      )
    ).toBe(true);
  });

  test("keeps the detected linter when prompts are skipped", async () => {
    const mockWriteFile = mock((_path: string, _content: string) =>
      Promise.resolve()
    );
    const mockRm = mock((_path: string) => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      rm: mockRm,
      writeFile: mockWriteFile,
    }));
    mock.module("@clack/prompts", quietPrompts);
    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
    }));
    mockDetectLinter.mockImplementation(() => "biome");

    try {
      await initialize({ agents: [], pm: "npm", skipInstall: true });
    } finally {
      mockDetectLinter.mockImplementation(() => null);
    }

    const writtenPaths = mockWriteFile.mock.calls.map(([filePath]) =>
      String(filePath)
    );
    const removedPaths = mockRm.mock.calls.map(([filePath]) =>
      String(filePath)
    );

    expect(writtenPaths.some((p) => p.endsWith("biome.jsonc"))).toBe(true);
    expect(writtenPaths.some((p) => p.endsWith("oxlint.config.ts"))).toBe(
      false
    );
    expect(removedPaths.some((p) => p.includes("biome"))).toBe(false);
  });

  test("preselects the detected linter in the prompt", async () => {
    const prompts = quietPrompts();
    const mockSelect = mock(() => Promise.resolve("eslint"));

    mock.module("@clack/prompts", () => ({ ...prompts, select: mockSelect }));
    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      dlxCommand: mock(() => "npx ultracite fix"),
    }));
    mockDetectLinter.mockImplementation(() => "eslint");

    try {
      await initialize({ skipInstall: true });
    } finally {
      mockDetectLinter.mockImplementation(() => null);
    }

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({ initialValue: "eslint" })
    );
  });
});

// Runs a prompt-free oxlint init on a package.json with the given contents.
// Returns the package.json documents init wrote and every path it wrote.
const runOxlintInit = async (packageJson: string) => {
  const mockWriteFile = mock((_path: string, _content: string) =>
    Promise.resolve()
  );

  mock.module("node:fs/promises", () => ({
    access: mock(() => Promise.reject(new Error("ENOENT"))),
    mkdir: mock(() => Promise.resolve()),
    readFile: mock(() => Promise.resolve(packageJson)),
    rm: mock(() => Promise.resolve()),
    writeFile: mockWriteFile,
  }));
  mock.module("@clack/prompts", quietPrompts);
  mock.module("nypm", () => ({
    addDevDependency: mock(() => Promise.resolve()),
    detectPackageManager: mock(() =>
      Promise.resolve({ name: "npm", warnings: [] })
    ),
    dlxCommand: mock(() => "npx ultracite fix"),
  }));
  mockFileSystem({ "package.json": packageJson });

  try {
    await initialize({
      agents: [],
      editors: [],
      hooks: [],
      integrations: [],
      linter: "oxlint",
      pm: "npm",
      skipInstall: true,
    });
  } finally {
    restoreFileSystemMock();
  }

  const writes = mockWriteFile.mock.calls.map(([filePath, content]) => ({
    content,
    filePath: String(filePath),
  }));

  return {
    packageJsons: writes
      .filter(({ filePath }) => filePath === "package.json")
      .map(({ content }) => JSON.parse(content)),
    paths: writes.map(({ filePath }) => filePath),
  };
};

describe("package.json module type", () => {
  test("keeps a package without a type as it is and writes .mts configs", async () => {
    const { packageJsons, paths } = await runOxlintInit('{"name": "app"}');

    expect(packageJsons.length).toBeGreaterThan(0);
    for (const packageJson of packageJsons) {
      expect(packageJson.type).toBeUndefined();
    }
    expect(paths).toContain("./oxlint.config.mts");
    expect(paths).toContain("./oxfmt.config.mts");
  });

  test("writes .mts configs in a CommonJS package", async () => {
    const { packageJsons, paths } = await runOxlintInit(
      '{"name": "app", "type": "commonjs"}'
    );

    for (const packageJson of packageJsons) {
      expect(packageJson.type).toBe("commonjs");
    }
    expect(paths).toContain("./oxlint.config.mts");
    expect(paths).toContain("./oxfmt.config.mts");
  });

  test("writes .ts configs in an ES module package", async () => {
    const { paths } = await runOxlintInit('{"name": "app", "type": "module"}');

    expect(paths).toContain("./oxlint.config.ts");
    expect(paths).toContain("./oxfmt.config.ts");
  });
});

// Prompts that answer every question with nothing, recording the calls.
const recordingPrompts = (confirmAnswer = false) => {
  const calls = {
    confirm: mock((_prompt: { message: string }) =>
      Promise.resolve(confirmAnswer)
    ),
    multiselect: mock(() => Promise.resolve([])),
    select: mock(() => Promise.resolve("oxlint")),
    warn: mock((_message: string) => {}),
  };

  mock.module("@clack/prompts", () => ({
    cancel: mock(noop),
    confirm: calls.confirm,
    intro: mock(noop),
    isCancel: mock(() => false),
    log: {
      error: mock(noop),
      info: mock(noop),
      success: mock(noop),
      warn: calls.warn,
    },
    multiselect: calls.multiselect,
    outro: mock(noop),
    select: calls.select,
    spinner: mock(() => ({
      message: mock(noop),
      start: mock(noop),
      stop: mock(noop),
    })),
  }));

  return calls;
};

// A project with these files, as both node:fs and node:fs/promises see it.
// Returns the paths written and removed.
const mockProject = (files: Record<string, string>) => {
  const written = new Map<string, string>();
  const removed: string[] = [];

  mockFileSystem(
    Object.fromEntries(
      Object.entries(files).flatMap(([filePath, content]) => [
        [filePath, content],
        [`./${filePath}`, content],
      ])
    )
  );
  mock.module("node:fs/promises", () => ({
    access: mock(() => Promise.reject(new Error("ENOENT"))),
    mkdir: mock(() => Promise.resolve()),
    readFile: mock((filePath: string) => {
      const content = files[String(filePath).replace(/^\.\//u, "")];
      return content === undefined
        ? Promise.reject(new Error("ENOENT"))
        : Promise.resolve(content);
    }),
    rm: mock((filePath: string) => {
      removed.push(String(filePath));
      return Promise.resolve();
    }),
    writeFile: mock((filePath: string, content: string) => {
      written.set(String(filePath), content);
      return Promise.resolve();
    }),
  }));
  mock.module("fast-glob", () => ({
    default: mock(() =>
      Promise.resolve(
        Object.keys(files).filter((filePath) => filePath.startsWith("tsconfig"))
      )
    ),
  }));

  return { removed, written };
};

const restoreProject = () => {
  restoreFileSystemMock();
  mock.module("fast-glob", () => ({
    default: mock(() => Promise.resolve([])),
  }));
};

describe("init questions", () => {
  test("--quiet alone still asks the questions", async () => {
    const prompts = recordingPrompts();
    mockProject({ "package.json": '{"name": "app"}' });

    try {
      await initialize({ quiet: true, skipInstall: true });
    } finally {
      restoreProject();
    }

    expect(prompts.select).toHaveBeenCalled();
  });

  test("--quiet still prints warnings", async () => {
    const prompts = recordingPrompts();
    mockProject({
      "package.json": '{"name": "app", "scripts": {"check": "tsc --noEmit"}}',
    });

    try {
      await initialize({
        linter: "oxlint",
        quiet: true,
        skipInstall: true,
        yes: true,
      });
    } finally {
      restoreProject();
    }

    expect(
      prompts.warn.mock.calls.some(([message]) =>
        message.includes('already has a "check" script')
      )
    ).toBe(true);
  });

  test("asks before removing another linter's setup, and keeps it on no", async () => {
    const prompts = recordingPrompts(false);
    const { removed } = mockProject({
      "biome.jsonc": "{}",
      "package.json": '{"name": "app"}',
    });

    try {
      await initialize({ linter: "oxlint", skipInstall: true });
    } finally {
      restoreProject();
    }

    expect(
      prompts.confirm.mock.calls.some(([prompt]) =>
        prompt.message.includes("Remove it")
      )
    ).toBe(true);
    expect(removed).not.toContain("./biome.jsonc");
  });

  test("removes another linter's setup without asking with --yes", async () => {
    const prompts = recordingPrompts();
    const { removed } = mockProject({
      "biome.jsonc": "{}",
      "package.json": '{"name": "app"}',
    });

    try {
      await initialize({ linter: "oxlint", skipInstall: true, yes: true });
    } finally {
      restoreProject();
    }

    expect(prompts.confirm).not.toHaveBeenCalled();
    expect(removed).toContain("./biome.jsonc");
  });

  test("keeps a legacy .eslintrc on an ESLint setup, which ESLint 10 ignores", async () => {
    recordingPrompts();
    const { removed } = mockProject({
      ".eslintrc.json": "{}",
      "package.json": '{"name": "app"}',
    });

    try {
      await migrateLinterConfig("eslint", true);
    } finally {
      restoreProject();
    }

    expect(removed).not.toContain("./.eslintrc.json");
  });

  test("still removes a legacy .eslintrc when moving off ESLint", async () => {
    recordingPrompts();
    const { removed } = mockProject({
      ".eslintrc.json": "{}",
      "package.json": '{"name": "app"}',
    });

    try {
      await migrateLinterConfig("oxlint", true);
    } finally {
      restoreProject();
    }

    expect(removed).toContain("./.eslintrc.json");
  });

  test("leaves tsconfig files alone without type-aware linting", async () => {
    recordingPrompts();
    const { written } = mockProject({
      "package.json": '{"name": "app"}',
      "tsconfig.json": '{"compilerOptions": {}}',
    });

    try {
      await initialize({ linter: "oxlint", skipInstall: true, yes: true });
    } finally {
      restoreProject();
    }

    expect(written.has("tsconfig.json")).toBe(false);
  });

  test("turns on strictNullChecks with --type-aware", async () => {
    recordingPrompts();
    const { written } = mockProject({
      "package.json": '{"name": "app"}',
      "tsconfig.json": '{"compilerOptions": {}}',
    });

    try {
      await initialize({
        linter: "oxlint",
        skipInstall: true,
        "type-aware": true,
        yes: true,
      });
    } finally {
      restoreProject();
    }

    expect(written.get("tsconfig.json")).toContain('"strictNullChecks": true');
    expect(written.get("./oxlint.config.mts")).toContain(
      "options: { typeAware: true }"
    );
  });

  test("asks before changing tsconfig files, and leaves them on no", async () => {
    const prompts = recordingPrompts(false);
    const { written } = mockProject({
      "package.json": '{"name": "app"}',
      "tsconfig.json": '{"compilerOptions": {}}',
    });

    try {
      await initialize({
        linter: "oxlint",
        skipInstall: true,
        "type-aware": true,
      });
    } finally {
      restoreProject();
    }

    expect(
      prompts.confirm.mock.calls.some(([prompt]) =>
        prompt.message.includes("strictNullChecks")
      )
    ).toBe(true);
    expect(written.has("tsconfig.json")).toBe(false);
  });

  test("asks about type-aware linting in a TypeScript project", async () => {
    const prompts = recordingPrompts(false);
    mockProject({
      "package.json": '{"name": "app"}',
      "tsconfig.json": '{"compilerOptions": {}}',
    });

    try {
      await initialize({ linter: "oxlint", skipInstall: true });
    } finally {
      restoreProject();
    }

    expect(
      prompts.confirm.mock.calls.some(([prompt]) =>
        prompt.message.includes("type-aware")
      )
    ).toBe(true);
  });
});

describe("normalizeInitializeFlags", () => {
  test("maps renamed agent, editor and hook IDs to the current ones", () => {
    const prompts = recordingPrompts();

    expect(
      normalizeInitializeFlags({
        agents: ["mux", "amazon-q-cli", "kimi-cli", "snowflake-cortex"],
        editors: ["windsurf"],
        hooks: ["windsurf"],
      })
    ).toMatchObject({
      agents: ["xum", "kiro-cli", "kimi-code", "snowflake-coco"],
      editors: ["devin"],
      hooks: ["devin"],
    });
    expect(prompts.warn).toHaveBeenCalledTimes(6);
  });

  test("writes AGENTS.md for an agent it doesn't know, instead of stopping", () => {
    const prompts = recordingPrompts();

    expect(
      normalizeInitializeFlags({ agents: ["roo-code", "claude"] }).agents
    ).toEqual(["universal", "claude"]);
    expect(prompts.warn).toHaveBeenCalledTimes(1);
  });

  test("still rejects an unknown editor", () => {
    recordingPrompts();

    expect(() =>
      validateInitializeFlags(
        normalizeInitializeFlags({ editors: ["notepad"] })
      )
    ).toThrow(UltraciteSetupError);
  });
});
