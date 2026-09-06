import { describe, expect, mock, spyOn, test } from "bun:test";

import { doctor, runDiagnostics } from "../src/commands/doctor";
import type { SpawnSyncOptions } from "../src/spawn-sync";

mock.module("../src/spawn-sync", () => ({
  spawnSync: mock(() => ({ status: 0, stdout: "v1.0.0" })),
}));

// Doctor resolves ultracite out of node_modules, so the fs mocks below have to
// describe it. Tests exercising the "not installed" state omit it instead.
const ULTRACITE_PACKAGE_JSON = JSON.stringify({
  exports: {
    "./biome/*": "./config/biome/*/biome.jsonc",
    "./eslint/*": "./config/eslint/*/eslint.config.mjs",
    "./oxlint/*": { default: "./config/oxlint/*/index.mjs" },
  },
  name: "ultracite",
});

const isNodeModulesPath = (filePath: string): boolean =>
  filePath.includes("node_modules");

mock.module("node:fs", () => ({
  accessSync: mock(() => {
    throw new Error("ENOENT");
  }),
  existsSync: mock(() => false),
  readFileSync: mock(() => "{}"),
}));

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

// Describe a project where every path exists, the linter config extends
// ultracite, and node_modules holds the given tool manifests.
const mockInstalledVersions = (versions: Record<string, string>) => {
  mock.module("../src/spawn-sync", () => ({
    spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
  }));
  mock.module("node:fs", () => ({
    accessSync: mock((path: string) => {
      const p = String(path);
      const match =
        /node_modules\/(?<name>@?[^/]+(?:\/[^/]+)?)\/package\.json$/u.exec(p);
      const name = match?.groups?.name;
      if (name && name !== "ultracite" && !(name in versions)) {
        throw new Error("ENOENT");
      }
    }),
    existsSync: mock(() => true),
    readFileSync: mock((path: string) => {
      const p = String(path);
      for (const [name, version] of Object.entries(versions)) {
        if (p.includes(`node_modules/${name}/package.json`)) {
          return JSON.stringify({ name, version });
        }
      }
      if (isNodeModulesPath(p)) {
        return ULTRACITE_PACKAGE_JSON;
      }
      if (p.includes("biome.json")) {
        return '{"extends": ["ultracite/biome/core"]}';
      }
      if (p.includes("eslint.config")) {
        return 'import core from "ultracite/eslint/core";';
      }
      if (p.includes("oxlint.config.ts")) {
        return 'import core from "ultracite/oxlint/core";';
      }
      if (p.includes("oxfmt.config.ts")) {
        return 'import ultracite from "ultracite/oxfmt";';
      }
      return '{"devDependencies": {"ultracite": "1.0.0"}}';
    }),
  }));
};

const versionCheck = (linter: "biome" | "eslint" | "oxlint", name: string) =>
  runDiagnostics(linter).find((check) => check.name === `${name} version`);

describe("doctor", () => {
  // ---------------------------------------------------------------------------
  // No linter detected
  // ---------------------------------------------------------------------------

  test("fails when no linter configuration is detected", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => null,
    }));

    expect(() => doctor()).toThrow("Doctor checks failed");
  });

  // ---------------------------------------------------------------------------
  // Biome linter
  // ---------------------------------------------------------------------------

  test("passes when biome is fully configured", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.includes("biome.json") || p.includes("package.json");
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("biome.json")) {
          return '{"extends": ["ultracite/biome/core"]}';
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("passes when biome is configured via a .biome.jsonc dotfile", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.endsWith(".biome.jsonc") || p.endsWith("package.json");
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.endsWith(".biome.jsonc")) {
          return '{"extends": ["ultracite/biome/core"]}';
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("fails when biome is not installed", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 1, stdout: "" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock((path: string) =>
        isNodeModulesPath(String(path)) ? ULTRACITE_PACKAGE_JSON : "{}"
      ),
    }));

    expect(() => doctor()).toThrow("Doctor checks failed");
  });

  test("fails when biome config cannot be parsed", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => String(path).includes("biome.jsonc")),
      readFileSync: mock((path: string) => {
        if (String(path).includes("biome.jsonc")) {
          throw new Error("Read error");
        }
        return "{}";
      }),
    }));

    expect(() => doctor()).toThrow("Doctor checks failed");
  });

  test("warns when biome config does not extend ultracite", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.includes("biome.json") || p.includes("package.json");
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("biome.json")) {
          return '{"formatter": {"indentStyle": "space"}}';
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    // Should complete without throwing (warnings only)
    doctor();
    consoleLogSpy.mockRestore();
  });

  test("checks biome using the bare executable with shell disabled", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    const mockSpawn = mock(
      (_cmd: string, _args: string[], _opts: SpawnSyncOptions) => ({
        status: 0,
        stdout: "1.0.0",
      })
    );

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mockSpawn,
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock((path: string) =>
        isNodeModulesPath(String(path)) ? ULTRACITE_PACKAGE_JSON : "{}"
      ),
    }));

    // Will warn but not fail (config missing is warn-level for shared checks)
    try {
      doctor();
    } catch {
      // May fail due to missing config — that's OK, we're checking spawn args
    }

    // Shell interpretation is disabled inside the spawn-sync adapter (see
    // spawn-sync.test.ts), so the bare executable name is spawned directly.
    const [firstCall] = mockSpawn.mock.calls;
    const [command, args] = firstCall;
    expect(command).toBe("biome");
    expect(args).toEqual(["--version"]);
    consoleLogSpy.mockRestore();
  });

  test("warns about conflicting prettier for biome users", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return (
          p.includes(".prettierrc") ||
          p.includes("biome.json") ||
          p.includes("package.json")
        );
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("biome.json")) {
          return '{"extends": ["ultracite/biome/core"]}';
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // ESLint linter
  // ---------------------------------------------------------------------------

  test("does not warn about prettier for eslint users", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "eslint",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return (
          p.includes(".prettierrc") ||
          p.includes("eslint.config.mjs") ||
          p.includes("prettier.config.mjs") ||
          p.includes("package.json")
        );
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("eslint.config")) {
          return "import ultracite/eslint";
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("checks eslint config imports ultracite", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "eslint",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return (
          p.includes("eslint.config.mjs") ||
          p.includes("prettier.config.mjs") ||
          p.includes("package.json")
        );
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("eslint.config")) {
          return 'import core from "ultracite/eslint/core";';
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("handles eslint config read error", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "eslint",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.includes("eslint.config.mjs");
      }),
      readFileSync: mock((path: string) => {
        if (String(path).includes("eslint.config")) {
          throw new Error("Read error");
        }
        return "{}";
      }),
    }));

    expect(() => doctor()).toThrow("Doctor checks failed");
  });

  // ---------------------------------------------------------------------------
  // Oxlint linter
  // ---------------------------------------------------------------------------

  test("checks oxlint config extends ultracite", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "oxlint",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return (
          p.includes("oxlint.config.ts") ||
          p.includes("oxfmt.config.ts") ||
          p.includes("package.json")
        );
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("oxlint.config.ts")) {
          return 'import core from "ultracite/oxlint/core";';
        }
        if (p.includes("oxfmt.config.ts")) {
          return 'import ultracite from "ultracite/oxfmt";';
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("warns when oxlint config does not extend ultracite", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "oxlint",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return (
          p.includes("oxlint.config.ts") ||
          p.includes("oxfmt.config.ts") ||
          p.includes("package.json")
        );
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("oxlint.config.ts")) {
          return 'import core from "some-other-config";';
        }
        if (p.includes("oxfmt.config.ts")) {
          return 'import config from "some-other-config";';
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    // Should complete without throwing (warnings only)
    doctor();
    consoleLogSpy.mockRestore();
  });

  test("warns when oxfmt config does not extend ultracite", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "oxlint",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return (
          p.includes("oxlint.config.ts") ||
          p.includes("oxfmt.config.ts") ||
          p.includes("package.json")
        );
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("oxlint.config.ts")) {
          return 'import core from "ultracite/oxlint/core";';
        }
        if (p.includes("oxfmt.config.ts")) {
          return 'import config from "some-other-oxfmt";';
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("fails when oxfmt config cannot be read", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "oxlint",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.includes("oxlint.config.ts") || p.includes("oxfmt.config.ts");
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("oxlint.config.ts")) {
          return 'import core from "ultracite/oxlint/core";';
        }
        if (p.includes("oxfmt.config.ts")) {
          throw new Error("Read error");
        }
        return "{}";
      }),
    }));

    expect(() => doctor()).toThrow("Doctor checks failed");
  });

  test("fails when oxlint config is missing", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "oxlint",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock((path: string) =>
        isNodeModulesPath(String(path)) ? ULTRACITE_PACKAGE_JSON : "{}"
      ),
    }));

    expect(() => doctor()).toThrow("Doctor checks failed");
  });

  test("handles oxlint config read error", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "oxlint",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.includes("oxlint.config.ts");
      }),
      readFileSync: mock((path: string) => {
        if (String(path).includes("oxlint.config.ts")) {
          throw new Error("Read error");
        }
        return "{}";
      }),
    }));

    expect(() => doctor()).toThrow("Doctor checks failed");
  });

  // ---------------------------------------------------------------------------
  // Shared checks
  // ---------------------------------------------------------------------------

  test("fails when eslint config is missing", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "eslint",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock((path: string) =>
        isNodeModulesPath(String(path)) ? ULTRACITE_PACKAGE_JSON : "{}"
      ),
    }));

    expect(() => doctor()).toThrow("Doctor checks failed");
  });

  test("warns when eslint config does not import ultracite", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "eslint",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return (
          p.includes("eslint.config.mjs") ||
          p.includes("prettier.config.mjs") ||
          p.includes("package.json")
        );
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("eslint.config")) {
          return 'import something from "some-other-config";';
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("warns about legacy eslint configs", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return (
          p.includes("biome.json") ||
          p.includes(".eslintrc.json") ||
          p.includes("package.json")
        );
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("biome.json")) {
          return '{"extends": ["ultracite/biome/core"]}';
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("warns when package.json parses to null", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.includes("biome.json") || p.includes("package.json");
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("biome.json")) {
          return '{"extends": ["ultracite/biome/core"]}';
        }
        return "null";
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("warns when package.json is missing", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => String(path).includes("biome.json")),
      readFileSync: mock((path: string) => {
        if (String(path).includes("biome.json")) {
          return '{"extends": ["ultracite/biome/core"]}';
        }
        if (String(path).includes("package.json")) {
          throw new Error("File not found");
        }
        return "{}";
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("warns when ultracite is not in package.json", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.includes("biome.json") || p.includes("package.json");
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("biome.json")) {
          return '{"extends": ["ultracite/biome/core"]}';
        }
        return '{"name": "test", "dependencies": {}, "devDependencies": {}}';
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("fails when ultracite is in package.json but not installed", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    // Nothing under node_modules: ultracite is declared but never installed,
    // which is the state Biome fails on.
    mock.module("node:fs", () => ({
      accessSync: mock((path: string) => {
        if (isNodeModulesPath(String(path))) {
          throw new Error("ENOENT");
        }
      }),
      existsSync: mock((path: string) => {
        const p = String(path);

        if (isNodeModulesPath(p)) {
          return false;
        }

        return p.includes("biome.json") || p.includes("package.json");
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (p.includes("biome.json")) {
          return '{"extends": ["ultracite/biome/core"]}';
        }
        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    try {
      expect(() => doctor()).toThrow("Doctor checks failed");
    } finally {
      consoleLogSpy.mockRestore();
    }
  });

  test("warns when package.json cannot be parsed", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("../src/spawn-sync", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.includes("biome.json") || p.includes("package.json");
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (isNodeModulesPath(p)) {
          return ULTRACITE_PACKAGE_JSON;
        }
        if (p.includes("biome.json")) {
          return '{"extends": ["ultracite/biome/core"]}';
        }
        return "invalid json {";
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // Toolchain version checks
  // ---------------------------------------------------------------------------

  test("passes when the installed biome satisfies the supported range", () => {
    mockInstalledVersions({ "@biomejs/biome": "2.5.12" });

    expect(versionCheck("biome", "@biomejs/biome")).toMatchObject({
      message: "@biomejs/biome 2.5.12 satisfies ^2.5.0",
      status: "pass",
    });
  });

  test("fails when the installed biome is older than the presets require", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mockInstalledVersions({ "@biomejs/biome": "2.4.9" });

    expect(versionCheck("biome", "@biomejs/biome")).toMatchObject({
      message: expect.stringContaining(
        "@biomejs/biome 2.4.9 is older than Ultracite"
      ),
      status: "fail",
    });
    expect(versionCheck("biome", "@biomejs/biome")?.message).toContain(
      "run `ultracite upgrade`"
    );
    expect(() => doctor()).toThrow("Doctor checks failed");
  });

  test("warns when the installed biome is newer than the verified range", () => {
    mockInstalledVersions({ "@biomejs/biome": "3.0.0" });

    expect(versionCheck("biome", "@biomejs/biome")).toMatchObject({
      message: expect.stringContaining("is newer than Ultracite"),
      status: "warn",
    });
  });

  test("warns when a required tool's version cannot be determined", () => {
    mockInstalledVersions({});

    expect(versionCheck("biome", "@biomejs/biome")).toMatchObject({
      message: expect.stringContaining(
        "Could not determine the installed @biomejs/biome version"
      ),
      status: "warn",
    });
  });

  test("checks eslint, prettier and stylelint versions for eslint setups", () => {
    mockInstalledVersions({
      eslint: "10.9.1",
      prettier: "2.8.8",
      stylelint: "17.2.0",
    });

    expect(versionCheck("eslint", "eslint")).toMatchObject({ status: "pass" });
    expect(versionCheck("eslint", "prettier")).toMatchObject({
      message: expect.stringContaining("prettier 2.8.8 is older"),
      status: "fail",
    });
    expect(versionCheck("eslint", "stylelint")).toMatchObject({
      status: "pass",
    });
  });

  test("skips the optional stylelint version check when it isn't installed", () => {
    mockInstalledVersions({ eslint: "10.9.1", prettier: "3.8.1" });

    expect(versionCheck("eslint", "stylelint")).toBeUndefined();
  });

  test("checks oxlint and oxfmt versions for oxlint setups", () => {
    mockInstalledVersions({ oxfmt: "0.30.0", oxlint: "1.81.0" });

    expect(versionCheck("oxlint", "oxlint")).toMatchObject({ status: "pass" });
    expect(versionCheck("oxlint", "oxfmt")).toMatchObject({
      message: expect.stringContaining("oxfmt 0.30.0 is older"),
      status: "fail",
    });
  });
});
