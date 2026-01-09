import { describe, expect, mock, test } from "bun:test";

import {
  initialize,
  initializeLefthook,
  initializeLintStaged,
  initializePreCommit,
  initializePrecommitHook,
  installDependencies,
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
} from "../src/initialize";

// Data package mocks are in preload.ts (must run before imports)

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  mkdir: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve('{"name": "test"}')),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("node:child_process", () => ({
  execSync: mock(() => ""),
  spawnSync: mock(() => ({ status: 0 })),
}));

mock.module("nypm", () => ({
  addDevDependency: mock(() => Promise.resolve()),
  detectPackageManager: mock(() =>
    Promise.resolve({ name: "npm", warnings: [] })
  ),
  dlxCommand: mock(() => "npx ultracite fix"),
  removeDependency: mock(() => Promise.resolve()),
}));

mock.module("glob", () => ({
  glob: mock(() => Promise.resolve([])),
}));

// noop function to satisfy linter
const noop = () => {
  // intentionally empty mock
};

mock.module("@clack/prompts", () => ({
  cancel: mock(noop),
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

describe("initialize", () => {
  // Note: We don't call mock.restore() here because it causes issues
  // with module re-loading when the tests transition between each other

  test("shows editor config prompt when editors not specified", async () => {
    const mockMultiselect = mock(() => Promise.resolve([]));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
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

    // Pass all options except editors to trigger just the editor prompt
    await initialize({
      agents: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      linter: "biome",
      pm: "npm",
      skipInstall: true,
    });

    expect(mockMultiselect).toHaveBeenCalled();
  });

  test("shows agents prompt when agents not specified", async () => {
    const mockMultiselect = mock(() => Promise.resolve([]));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
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

    // Pass all options except agents to trigger just the agents prompt
    await initialize({
      editors: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      linter: "biome",
      pm: "npm",
      skipInstall: true,
    });

    expect(mockMultiselect).toHaveBeenCalled();
  });

  test("shows hooks prompt when hooks not specified", async () => {
    const mockMultiselect = mock(() => Promise.resolve([]));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
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

    // Pass all options except hooks to trigger just the hooks prompt
    await initialize({
      agents: [],
      editors: [],
      frameworks: [],
      integrations: [],
      linter: "biome",
      pm: "npm",
      skipInstall: true,
    });

    expect(mockMultiselect).toHaveBeenCalled();
  });

  test("cancels when user cancels editor config prompt", async () => {
    const mockCancel = mock(noop);
    const mockMultiselect = mock(() => Symbol.for("cancel"));

    mock.module("@clack/prompts", () => ({
      cancel: mockCancel,
      intro: mock(noop),
      isCancel: mock((val) => val === Symbol.for("cancel")),
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

    // Pass all options except editors to trigger just the editor prompt (and cancel it)
    await initialize({
      agents: [],
      frameworks: [],
      hooks: [],
      integrations: [],
      linter: "biome",
      pm: "npm",
      skipInstall: true,
    });

    expect(mockCancel).toHaveBeenCalled();
  });

  test("cancels when user cancels agents prompt", async () => {
    const mockCancel = mock(noop);
    let callCount = 0;
    const mockMultiselect = mock(() => {
      callCount++;
      // First call is for editors, second for agents
      if (callCount === 1) {
        return Promise.resolve([]); // Return empty for editors
      }
      return Symbol.for("cancel"); // Cancel for agents
    });

    mock.module("@clack/prompts", () => ({
      cancel: mockCancel,
      intro: mock(noop),
      isCancel: mock((val) => val === Symbol.for("cancel")),
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

    // Pass all options except editors and agents to trigger those prompts
    await initialize({
      frameworks: [],
      hooks: [],
      integrations: [],
      linter: "biome",
      pm: "npm",
      skipInstall: true,
    });

    expect(mockCancel).toHaveBeenCalled();
  });

  test("uses eslint linter when selected", async () => {
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
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
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
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

  test("installs oxlint-tsgolint when type-aware flag is set with oxlint", async () => {
    const installedPackages: string[] = [];
    const mockAddDep = mock((pkg: string) => {
      installedPackages.push(pkg);
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

    expect(installedPackages).toContain("oxlint-tsgolint@latest");
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
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
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
      migrate: [],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("creates agent configs when specified", async () => {
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
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
      migrate: [],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("sets up integrations when specified", async () => {
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
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
      migrate: [],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("updates husky when hook already exists", async () => {
    const mockWriteFile = mock(() => Promise.resolve());

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
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
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
      hooks: ["cursor", "windsurf", "claude"],
      integrations: [],
      pm: "npm",
      skipInstall: true,
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("sets up lefthook integration when specified", async () => {
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
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
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      mkdir: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
    }));

    mock.module("@clack/prompts", () => ({
      cancel: mock(noop),
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
    }).toThrow("No package manager specified or detected");
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
        migrate: [],
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

      await installDependencies("npm", "biome", true);
      expect(mockAddDep).toHaveBeenCalled();
    });

    test("updates package.json when install is false", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
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

      await installDependencies("npm", "biome", false);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("installs eslint dependencies when linter is eslint", async () => {
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

      await installDependencies("npm", "eslint", true);
      expect(mockAddDep).toHaveBeenCalled();
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

      await installDependencies("npm", "oxlint", true);
      expect(mockAddDep).toHaveBeenCalled();
    });

    test("updates package.json with eslint deps when install is false", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
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

      await installDependencies("npm", "eslint", false);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates package.json with oxlint deps when install is false", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
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

      await installDependencies("npm", "oxlint", false);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("installs oxlint-tsgolint when type-aware is true", async () => {
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

      await installDependencies("npm", "oxlint", true, true, true);
      expect(installedPackages).toContain("oxlint-tsgolint@latest");
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

      await installDependencies("npm", "oxlint", true, true, false);
      expect(installedPackages).not.toContain("oxlint-tsgolint@latest");
    });

    test("updates package.json with oxlint-tsgolint when type-aware and install is false", async () => {
      let writtenContent = "";
      const mockWriteFile = mock((_path: string, content: string) => {
        writtenContent = content;
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

      await installDependencies("npm", "oxlint", false, true, true);
      expect(mockWriteFile).toHaveBeenCalled();
      expect(writtenContent).toContain("oxlint-tsgolint");
    });
  });

  describe("upsertTsConfig", () => {
    test("updates existing tsconfig", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
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

      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve(["./tsconfig.json"])),
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

      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve([])),
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
        // @ts-expect-error - Testing invalid editor
        await upsertEditorConfig("invalid-editor");
      }).toThrow('Editor "invalid-editor" not found');
    });

    test("creates vscode settings when not exists", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("node:child_process", () => ({
        execSync: mock(() => ""),
        spawnSync: mock(() => ({ status: 0 })),
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

    test("updates existing vscode settings", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      // Mock extension install to throw error
      mock.module("node:child_process", () => ({
        execSync: mock(() => ""),
        spawnSync: mock(() => {
          throw new Error("Extension install failed");
        }),
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.oxlintrc.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"extends": []}')),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertOxlintConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertPrettierConfig", () => {
    test("creates prettier config", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
      const mockWriteFile = mock(() => Promise.resolve());
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
    test("installs and creates husky hook", async () => {
      const mockAddDep = mock(() => Promise.resolve());
      const mockWriteFile = mock(() => Promise.resolve());

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

      mock.module("node:child_process", () => ({
        execSync: mock(() => ""),
        spawnSync: mock(() => ({ status: 0 })),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await initializePrecommitHook("npm", true);
      expect(mockAddDep).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing husky hook", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

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

      mock.module("node:child_process", () => ({
        execSync: mock(() => ""),
        spawnSync: mock(() => ({ status: 0 })),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await initializePrecommitHook("npm", false);
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("initializeLefthook", () => {
    test("creates lefthook config", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
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

      await initializeLefthook("npm", true);
      expect(mockAddDep).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing lefthook config", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

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

      await initializeLefthook("npm", false);
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("initializeLintStaged", () => {
    test("creates lint-staged config", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
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

      await initializeLintStaged("npm", true);
      expect(mockAddDep).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing lint-staged config", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

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

      await initializeLintStaged("npm", false);
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertAgents", () => {
    test("creates agent config when not exists", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

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

      await upsertAgents("claude", "Claude Code", "npm", "biome");
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing agent config", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".claude/CLAUDE.md") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("# existing rules")),
        writeFile: mockWriteFile,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          message: mock(noop),
          start: mock(noop),
          stop: mock(noop),
        })),
      }));

      await upsertAgents("claude", "Claude Code", "npm", "biome");
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });
});
