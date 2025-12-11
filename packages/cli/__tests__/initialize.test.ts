import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
  initialize,
  initializeLefthook,
  initializeLintStaged,
  initializePrecommitHook,
  installDependencies,
  removeEsLint,
  removePrettier,
  upsertAgents,
  upsertBiomeConfig,
  upsertTsConfig,
  upsertVsCodeSettings,
  upsertZedSettings,
} from "../src/initialize";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve('{"name": "test"}')),
  writeFile: mock(() => Promise.resolve()),
  mkdir: mock(() => Promise.resolve()),
}));

mock.module("node:child_process", () => ({
  spawnSync: mock(() => ({ status: 0 })),
  execSync: mock(() => ""),
}));

mock.module("nypm", () => ({
  addDevDependency: mock(() => Promise.resolve()),
  dlxCommand: mock(() => "npx ultracite fix"),
  detectPackageManager: mock(() =>
    Promise.resolve({ name: "npm", warnings: [] })
  ),
  removeDependency: mock(() => Promise.resolve()),
}));

mock.module("glob", () => ({
  glob: mock(() => Promise.resolve([])),
}));

mock.module("@clack/prompts", () => ({
  intro: mock(() => {}),
  outro: mock(() => {}),
  spinner: mock(() => ({
    start: mock(() => {}),
    stop: mock(() => {}),
    message: mock(() => {}),
  })),
  log: {
    info: mock(() => {}),
    success: mock(() => {}),
    error: mock(() => {}),
    warn: mock(() => {}),
  },
  multiselect: mock(() => Promise.resolve([])),
  isCancel: mock(() => false),
  cancel: mock(() => {}),
}));

describe("initialize", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("completes successfully with minimal options", async () => {
    const mockLog = {
      info: mock(() => {}),
      success: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
    };

    mock.module("@clack/prompts", () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: mockLog,
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      pm: "npm",
      skipInstall: true,
      editors: [],
      agents: [],
      integrations: [],
      frameworks: [],
      migrate: [],
    });

    expect(mockLog.success).toHaveBeenCalled();
  });

  test("detects package manager when not provided", async () => {
    const mockDetect = mock(() =>
      Promise.resolve({ name: "pnpm", warnings: [] })
    );
    const mockLog = {
      info: mock(() => {}),
      success: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
    };

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.resolve()),
      dlxCommand: mock(() => "npx ultracite fix"),
      detectPackageManager: mockDetect,
      removeDependency: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: mockLog,
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      skipInstall: true,
      editors: [],
      agents: [],
      integrations: [],
      frameworks: [],
      migrate: [],
    });

    expect(mockDetect).toHaveBeenCalled();
    expect(mockLog.info).toHaveBeenCalled();
  });

  test("installs dependencies when skipInstall is false", async () => {
    const mockAddDep = mock(() => Promise.resolve());

    mock.module("nypm", () => ({
      addDevDependency: mockAddDep,
      dlxCommand: mock(() => "npx ultracite fix"),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      removeDependency: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: {
        info: mock(() => {}),
        success: mock(() => {}),
        error: mock(() => {}),
        warn: mock(() => {}),
      },
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      pm: "npm",
      skipInstall: false,
      editors: [],
      agents: [],
      integrations: [],
      frameworks: [],
      migrate: [],
    });

    expect(mockAddDep).toHaveBeenCalled();
  });

  test("creates editor configs when specified", async () => {
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
      mkdir: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: {
        info: mock(() => {}),
        success: mock(() => {}),
        error: mock(() => {}),
        warn: mock(() => {}),
      },
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      pm: "npm",
      skipInstall: true,
      editors: ["vscode", "zed"],
      agents: [],
      integrations: [],
      frameworks: [],
      migrate: [],
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("creates agent configs when specified", async () => {
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
      mkdir: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: {
        info: mock(() => {}),
        success: mock(() => {}),
        error: mock(() => {}),
        warn: mock(() => {}),
      },
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      pm: "npm",
      skipInstall: true,
      editors: [],
      agents: ["cursor", "windsurf"],
      integrations: [],
      frameworks: [],
      migrate: [],
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("sets up integrations when specified", async () => {
    const mockWriteFile = mock(() => Promise.resolve());

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.reject(new Error("ENOENT"))),
      readFile: mock(() => Promise.resolve('{"name": "test"}')),
      writeFile: mockWriteFile,
      mkdir: mock(() => Promise.resolve()),
    }));

    mock.module("@clack/prompts", () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: {
        info: mock(() => {}),
        success: mock(() => {}),
        error: mock(() => {}),
        warn: mock(() => {}),
      },
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    await initialize({
      pm: "npm",
      skipInstall: true,
      editors: [],
      agents: [],
      integrations: ["husky", "lint-staged"],
      frameworks: [],
      migrate: [],
    });

    expect(mockWriteFile).toHaveBeenCalled();
  });

  test("exits with error on failure", async () => {
    const mockLog = {
      info: mock(() => {}),
      success: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
    };

    mock.module("@clack/prompts", () => ({
      intro: mock(() => {}),
      outro: mock(() => {}),
      spinner: mock(() => ({
        start: mock(() => {}),
        stop: mock(() => {}),
        message: mock(() => {}),
      })),
      log: mockLog,
      multiselect: mock(() => Promise.resolve([])),
      isCancel: mock(() => false),
      cancel: mock(() => {}),
    }));

    mock.module("nypm", () => ({
      addDevDependency: mock(() => Promise.reject(new Error("Install failed"))),
      dlxCommand: mock(() => "npx ultracite fix"),
      detectPackageManager: mock(() =>
        Promise.resolve({ name: "npm", warnings: [] })
      ),
      removeDependency: mock(() => Promise.resolve()),
    }));

    await expect(async () => {
      await initialize({
        pm: "npm",
        skipInstall: false,
        editors: [],
        agents: [],
        integrations: [],
        frameworks: [],
        migrate: [],
      });
    }).toThrow("Install failed");

    expect(mockLog.error).toHaveBeenCalled();
  });
});

describe("helper functions", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("installDependencies", () => {
    test("installs dependencies when install is true", async () => {
      const mockAddDep = mock(() => Promise.resolve());
      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await installDependencies("npm", true);
      expect(mockAddDep).toHaveBeenCalled();
    });

    test("updates package.json when install is false", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"name": "test"}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await installDependencies("npm", false);
      expect(mockWriteFile).toHaveBeenCalled();
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
        readFile: mock(() => Promise.resolve('{"compilerOptions": {}}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve(["./tsconfig.json"])),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertTsConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("skips when no tsconfig found", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve([])),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertTsConfig();
    });
  });

  describe("upsertVsCodeSettings", () => {
    test("creates vscode settings when not exists", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("node:child_process", () => ({
        spawnSync: mock(() => ({ status: 0 })),
        execSync: mock(() => ""),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertVsCodeSettings();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing vscode settings", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.vscode/settings.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve('{"editor.tabSize": 2}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertVsCodeSettings();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("handles vscode extension install error gracefully", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      // Mock extension install to throw error
      mock.module("node:child_process", () => ({
        spawnSync: mock(() => {
          throw new Error("Extension install failed");
        }),
        execSync: mock(() => ""),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      // Should not throw, just continue
      await upsertVsCodeSettings();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertZedSettings", () => {
    test("creates zed settings when not exists", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertZedSettings();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing zed settings", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.zed/settings.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve('{"theme": "dark"}')),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertZedSettings();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("upsertBiomeConfig", () => {
    test("creates biome config with frameworks", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
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
        readFile: mock(() =>
          Promise.resolve('{"extends": ["ultracite/core"]}')
        ),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertBiomeConfig();
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("initializePrecommitHook", () => {
    test("installs and creates husky hook", async () => {
      const mockAddDep = mock(() => Promise.resolve());
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("node:child_process", () => ({
        spawnSync: mock(() => ({ status: 0 })),
        execSync: mock(() => ""),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
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
        readFile: mock((path: string) => {
          if (path === "package.json") {
            return Promise.resolve('{"name": "test", "devDependencies": {}}');
          }
          return Promise.resolve("#!/bin/sh\necho test");
        }),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("node:child_process", () => ({
        spawnSync: mock(() => ({ status: 0 })),
        execSync: mock(() => ""),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
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
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
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
        readFile: mock((path: string) => {
          if (path === "package.json") {
            return Promise.resolve('{"name": "test"}');
          }
          return Promise.resolve(
            "pre-commit:\n  commands:\n    test:\n      run: echo test"
          );
        }),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
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
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        removeDependency: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
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
        readFile: mock((path: string) => {
          if (path === "package.json") {
            return Promise.resolve('{"name": "test"}');
          }
          return Promise.resolve('{"*.js": ["eslint"]}');
        }),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
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
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertAgents("cursor", "Cursor");
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("updates existing agent config", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.cursor/rules/ultracite.mdc") {
            return Promise.resolve();
          }
          if (path === "./.cursor/hooks.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock((path: string) => {
          if (path === "./.cursor/hooks.json") {
            return Promise.resolve(
              '{"version": 1, "hooks": {"afterFileEdit": []}}'
            );
          }
          return Promise.resolve("# existing rules");
        }),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await upsertAgents("cursor", "Cursor");
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("removePrettier", () => {
    test("removes prettier packages and files", async () => {
      const mockUnlink = mock(() => Promise.resolve());
      const mockRemoveDep = mock(() => Promise.resolve());

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        removeDependency: mockRemoveDep,
      }));

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".prettierrc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve('{"devDependencies": {"prettier": "2.0.0"}}')
        ),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        unlink: mockUnlink,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await removePrettier("npm");
      expect(mockRemoveDep).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
    });
  });

  describe("removeEsLint", () => {
    test("removes eslint packages and files", async () => {
      const mockUnlink = mock(() => Promise.resolve());
      const mockRemoveDep = mock(() => Promise.resolve());

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() =>
          Promise.resolve({ name: "npm", warnings: [] })
        ),
        removeDependency: mockRemoveDep,
      }));

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".eslintrc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve('{"devDependencies": {"eslint": "8.0.0"}}')
        ),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        unlink: mockUnlink,
      }));

      mock.module("@clack/prompts", () => ({
        spinner: mock(() => ({
          start: mock(() => {}),
          stop: mock(() => {}),
          message: mock(() => {}),
        })),
      }));

      await removeEsLint("npm");
      expect(mockRemoveDep).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
    });
  });
});
