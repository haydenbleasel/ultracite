import { describe, expect, mock, spyOn, test } from "bun:test";
import nodePath from "node:path";
import process from "node:process";

import { minVersion } from "semver";

import { version as runningVersion } from "../package.json";
import { doctor, runDiagnostics } from "../src/commands/doctor";
import type { DiagnosticCheck } from "../src/commands/doctor";
import {
  eslintCoreDevDependencies,
  eslintFrameworkDevDependencies,
} from "../src/dependencies";
import type { SpawnSyncOptions } from "../src/spawn-sync";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

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

// The CLI builds paths with path.join, so on Windows they arrive with
// backslashes. Normalise before matching so the mocks work on every OS.
const toPosixPath = (filePath: string): string =>
  String(filePath).replaceAll("\\", "/");

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
      const p = toPosixPath(path);

      const match =
        /node_modules\/(?<name>@?[^/]+(?:\/[^/]+)?)\/package\.json$/u.exec(p);

      const name = match?.groups?.name;

      if (name && name !== "ultracite" && !(name in versions)) {
        throw new Error("ENOENT");
      }
    }),
    existsSync: mock(() => true),
    readFileSync: mock((path: string) => {
      const p = toPosixPath(path);

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

const cwdPath = (...segments: string[]): string =>
  nodePath.join(process.cwd(), ...segments);

const manifest = (name: string, version: string): string =>
  JSON.stringify({ name, version });

// Every package in a dependency table, at the lowest version its range
// allows.
const pinnedPlugins = (
  dependencies: Record<string, string>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(dependencies).map(([name, range]) => [
      name,
      minVersion(range)?.version ?? range,
    ])
  );

const eslintConfig = (...presets: string[]): [string, string] => [
  "eslint.config.mjs",
  presets
    .map((preset) => `import ${preset} from "ultracite/eslint/${preset}";`)
    .join("\n"),
];

// "full" extends the whole js-plugins preset, a selectJsPlugins(...) call
// selects some of it, and leaving it out extends core alone.
const oxlintConfig = (jsPlugins?: string): [string, string] => [
  "oxlint.config.ts",
  [
    'import core from "ultracite/oxlint/core";',
    ...(jsPlugins === "full"
      ? ['import jsPlugins from "ultracite/oxlint/js-plugins";']
      : []),
    ...(jsPlugins && jsPlugins !== "full"
      ? [
          'import { selectJsPlugins } from "ultracite/oxlint/js-plugins";',
          `const jsPlugins = ${jsPlugins};`,
        ]
      : []),
  ].join("\n"),
];

// A project with the given linter config and node_modules holding Ultracite
// plus `installed` (package name -> version).
const pluginProject = (
  [configFile, config]: [string, string],
  installed: Record<string, string>
) => ({
  [cwdPath(configFile)]: config,
  [cwdPath("package.json")]: '{"devDependencies": {"ultracite": "1.0.0"}}',
  [cwdPath("node_modules", "ultracite", "package.json")]:
    ULTRACITE_PACKAGE_JSON,
  ...Object.fromEntries(
    Object.entries(installed).map(([name, version]) => [
      cwdPath("node_modules", name, "package.json"),
      manifest(name, version),
    ])
  ),
});

const toolVersionChecks = new Set(
  ["eslint", "oxfmt", "oxlint", "prettier", "stylelint"].map(
    (tool) => `${tool} version`
  )
);

// The plugin results among the diagnostics for a project laid out as `files`.
const pluginChecks = (
  linter: "eslint" | "oxlint",
  files: Record<string, string>,
  links: Record<string, string> = {}
): DiagnosticCheck[] => {
  mockFileSystem(files, links);

  try {
    return runDiagnostics(linter).filter(
      ({ name }) =>
        name === "Plugin versions" ||
        (name.endsWith(" version") && !toolVersionChecks.has(name))
    );
  } finally {
    restoreFileSystemMock();
  }
};

const findCheck = (checks: DiagnosticCheck[], name: string) =>
  checks.find((check) => check.name === name);

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

  test("checks the root config when a nested biome config extends //", () => {
    const nestedDir = process.cwd();

    const rootConfig = nodePath.join(
      nodePath.dirname(nestedDir),
      "biome.jsonc"
    );

    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(
        (filePath: string) =>
          filePath === nodePath.join(nestedDir, "biome.json") ||
          filePath === rootConfig
      ),
      readFileSync: mock((filePath: string) => {
        if (filePath === rootConfig) {
          return '{"extends": ["ultracite/biome/core"]}';
        }

        if (String(filePath).includes("biome.json")) {
          return '{"root": false, "extends": "//"}';
        }

        if (isNodeModulesPath(String(filePath))) {
          return ULTRACITE_PACKAGE_JSON;
        }

        return '{"devDependencies": {"ultracite": "1.0.0"}}';
      }),
    }));

    const checks = runDiagnostics("biome");

    const biomeCheck = checks.find(
      (check) => check.name === "Biome configuration"
    );

    expect(biomeCheck?.status).toBe("pass");
    expect(biomeCheck?.message).toBe(
      "biome.jsonc extends ultracite/biome/core"
    );
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

  test("fails when JSON and TS oxc configs sit side by side", () => {
    const present = new Set([
      ".oxlintrc.json",
      "oxlint.config.ts",
      ".oxfmtrc.json",
      "oxfmt.config.ts",
    ]);

    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((filePath: string) =>
        present.has(nodePath.basename(String(filePath)))
      ),
      readFileSync: mock((filePath: string) => {
        const p = String(filePath);

        if (p.includes("oxlint.config.ts")) {
          return 'import core from "ultracite/oxlint/core";';
        }

        if (p.includes("oxfmt.config.ts")) {
          return 'import ultracite from "ultracite/oxfmt";';
        }

        return "{}";
      }),
    }));

    const checks = runDiagnostics("oxlint");

    expect(
      checks.find((check) => check.name === "Oxlint configuration")
    ).toMatchObject({
      message: expect.stringContaining(
        ".oxlintrc.json and oxlint.config.ts are both present"
      ),
      status: "fail",
    });
    expect(
      checks.find((check) => check.name === "oxfmt configuration")
    ).toMatchObject({
      message: expect.stringContaining(
        "oxfmt.config.ts and .oxfmtrc.json are both present"
      ),
      status: "fail",
    });
  });

  test("finds .mts configs", () => {
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((filePath: string) =>
        ["oxlint.config.mts", "oxfmt.config.mts"].includes(
          nodePath.basename(String(filePath))
        )
      ),
      readFileSync: mock((filePath: string) =>
        String(filePath).includes("oxfmt")
          ? 'import ultracite from "ultracite/oxfmt";'
          : 'import core from "ultracite/oxlint/core";'
      ),
    }));

    const checks = runDiagnostics("oxlint");

    expect(
      checks.find((check) => check.name === "Oxlint configuration")
    ).toMatchObject({
      message: "oxlint.config.mts extends ultracite oxlint config",
      status: "pass",
    });
    expect(
      checks.find((check) => check.name === "oxfmt configuration")
    ).toMatchObject({
      message: "oxfmt.config.mts extends ultracite oxfmt config",
      status: "pass",
    });
  });

  test("fails a .ts config in a CommonJS package, which can't load it", () => {
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((filePath: string) =>
        ["oxlint.config.ts", "oxfmt.config.mts", "package.json"].includes(
          nodePath.basename(String(filePath))
        )
      ),
      readFileSync: mock((filePath: string) => {
        const p = String(filePath);

        if (p.endsWith("package.json")) {
          return '{"type": "commonjs"}';
        }

        return p.includes("oxfmt")
          ? 'import ultracite from "ultracite/oxfmt";'
          : 'import core from "ultracite/oxlint/core";';
      }),
    }));

    const checks = runDiagnostics("oxlint");

    expect(
      checks.find((check) => check.name === "Oxlint configuration")
    ).toMatchObject({
      message: expect.stringContaining(
        'oxlint.config.ts can\'t load because package.json sets "type": "commonjs"'
      ),
      status: "fail",
    });
  });

  test("only warns about unverifiable packages in a Yarn Plug'n'Play project", () => {
    mock.module("node:fs", () => ({
      accessSync: mock((filePath: string) => {
        if (!String(filePath).endsWith(".pnp.cjs")) {
          throw new Error("ENOENT");
        }
      }),
      existsSync: mock((filePath: string) =>
        ["oxlint.config.ts", "oxfmt.config.ts", "package.json"].includes(
          nodePath.basename(String(filePath))
        )
      ),
      readFileSync: mock((filePath: string) => {
        const p = String(filePath);

        if (p.includes("oxlint.config.ts")) {
          return 'import core from "ultracite/oxlint/core";';
        }

        if (p.includes("oxfmt.config.ts")) {
          return 'import ultracite from "ultracite/oxfmt";';
        }

        return '{"devDependencies": {"ultracite": "7.0.0"}}';
      }),
    }));

    const checks = runDiagnostics("oxlint");

    expect(
      checks.find((check) => check.name === "Ultracite dependency")
    ).toMatchObject({
      message: expect.stringContaining("Yarn Plug'n'Play"),
      status: "warn",
    });
    expect(
      checks.find((check) => check.name === "oxlint version")
    ).toMatchObject({
      message: expect.stringContaining("yarn why oxlint"),
      status: "warn",
    });
    expect(checks.some((check) => check.status === "fail")).toBe(false);
  });

  test("suggests migrating a lone .oxfmtrc.json", () => {
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((filePath: string) =>
        [".oxfmtrc.json", "oxlint.config.ts"].includes(
          nodePath.basename(String(filePath))
        )
      ),
      readFileSync: mock(() => 'import core from "ultracite/oxlint/core";'),
    }));

    const checks = runDiagnostics("oxlint");

    expect(
      checks.find((check) => check.name === "oxfmt configuration")
    ).toMatchObject({
      message:
        ".oxfmtrc.json found — run `ultracite init` to migrate to oxfmt.config.mts",
      status: "warn",
    });
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
    // Nothing under node_modules (and no Plug'n'Play manifest): ultracite is
    // declared but never installed, which is the state Biome fails on.
    mock.module("node:fs", () => ({
      accessSync: mock((path: string) => {
        if (isNodeModulesPath(String(path)) || String(path).includes(".pnp.")) {
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
    mockInstalledVersions({ "@biomejs/biome": "2.6.3" });

    expect(versionCheck("biome", "@biomejs/biome")).toMatchObject({
      message: "@biomejs/biome 2.6.3 satisfies ^2.6.2",
      status: "pass",
    });
  });

  test("fails when the installed biome is older than the presets require", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mockInstalledVersions({ "@biomejs/biome": "2.5.15" });

    expect(versionCheck("biome", "@biomejs/biome")).toMatchObject({
      message: expect.stringContaining(
        "@biomejs/biome 2.5.15 is older than Ultracite"
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

  test("fails eslint releases that can't load the presets", () => {
    mockInstalledVersions({ eslint: "10.8.1", prettier: "3.8.1" });

    expect(versionCheck("eslint", "eslint")).toMatchObject({
      message: expect.stringContaining("eslint 10.8.1 is older"),
      status: "fail",
    });
  });

  test("skips the optional stylelint version check when it isn't installed", () => {
    mockInstalledVersions({ eslint: "10.9.1", prettier: "3.8.1" });

    expect(versionCheck("eslint", "stylelint")).toBeUndefined();
  });

  test("checks oxlint and oxfmt versions for oxlint setups", () => {
    mockInstalledVersions({ oxfmt: "0.30.0", oxlint: "1.90.0" });

    expect(versionCheck("oxlint", "oxlint")).toMatchObject({ status: "pass" });
    expect(versionCheck("oxlint", "oxfmt")).toMatchObject({
      message: expect.stringContaining("oxfmt 0.30.0 is older"),
      status: "fail",
    });
  });

  test("fails oxlint releases that can't load the presets", () => {
    mockInstalledVersions({ oxlint: "1.89.0" });

    expect(versionCheck("oxlint", "oxlint")).toMatchObject({
      message: expect.stringContaining("oxlint 1.89.0 is older"),
      status: "fail",
    });
  });

  test("fails a plugin the config loads that's older than the version Ultracite installs", () => {
    const checks = pluginChecks(
      "eslint",
      pluginProject(eslintConfig("core", "react"), {
        ...pinnedPlugins(eslintCoreDevDependencies),
        ...pinnedPlugins(eslintFrameworkDevDependencies.react),
        "eslint-plugin-react-doctor": "0.9.18",
      })
    );

    expect(findCheck(checks, "eslint-plugin-react-doctor version")).toEqual({
      message: `eslint-plugin-react-doctor 0.9.18 is older than Ultracite ${runningVersion} requires (${eslintFrameworkDevDependencies.react["eslint-plugin-react-doctor"]}) — run \`ultracite upgrade\``,
      name: "eslint-plugin-react-doctor version",
      status: "fail",
    });
    // Every other plugin the core and React presets load is checked too.
    expect(findCheck(checks, "Plugin versions")).toMatchObject({
      message: expect.stringContaining("lint plugins the config loads satisfy"),
      status: "pass",
    });
    expect(checks.filter((check) => check.status === "fail")).toHaveLength(1);
  });

  test("ignores plugins the config doesn't load, wherever they came from", () => {
    // The react-doctor CLI pins oxlint-plugin-react-doctor exactly, and a
    // React app in a monorepo can hoist an old ESLint plugin to the root.
    const installed = {
      ...pinnedPlugins(eslintCoreDevDependencies),
      "eslint-plugin-react-doctor": "0.9.18",
      "oxlint-plugin-react-doctor": "0.9.18",
    };

    const eslintChecks = pluginChecks(
      "eslint",
      pluginProject(eslintConfig("core", "vue"), {
        ...installed,
        ...pinnedPlugins(eslintFrameworkDevDependencies.vue),
      })
    );

    const oxlintChecks = pluginChecks(
      "oxlint",
      pluginProject(oxlintConfig(), installed)
    );

    expect(
      findCheck(eslintChecks, "eslint-plugin-react-doctor version")
    ).toBeUndefined();
    expect(eslintChecks.filter((check) => check.status === "fail")).toEqual([]);
    expect(oxlintChecks).toEqual([]);
  });

  test("fails a plugin the config loads that isn't installed", () => {
    const { "eslint-plugin-react-doctor": _, ...installed } = {
      ...pinnedPlugins(eslintCoreDevDependencies),
      ...pinnedPlugins(eslintFrameworkDevDependencies.react),
    };

    const checks = pluginChecks(
      "eslint",
      pluginProject(eslintConfig("core", "react"), installed)
    );

    expect(findCheck(checks, "eslint-plugin-react-doctor version")).toEqual({
      message:
        "eslint-plugin-react-doctor isn't installed, but the config loads it — run `ultracite upgrade`",
      name: "eslint-plugin-react-doctor version",
      status: "fail",
    });
  });

  test("warns about a plugin release newer than the range Ultracite installs", () => {
    const checks = pluginChecks(
      "oxlint",
      pluginProject(oxlintConfig('selectJsPlugins(["react-doctor"])'), {
        "oxlint-plugin-react-doctor": "0.10.0",
      })
    );

    expect(
      findCheck(checks, "oxlint-plugin-react-doctor version")
    ).toMatchObject({
      message: expect.stringContaining(
        "oxlint-plugin-react-doctor 0.10.0 is newer than"
      ),
      status: "warn",
    });
  });

  test("checks only the JS plugins the Oxlint config selects", () => {
    const checks = pluginChecks(
      "oxlint",
      pluginProject(oxlintConfig('selectJsPlugins(["react-doctor"])'), {
        "eslint-plugin-github": "1.0.0",
        "oxlint-plugin-react-doctor": "0.9.18",
      })
    );

    expect(
      findCheck(checks, "oxlint-plugin-react-doctor version")
    ).toMatchObject({
      message: expect.stringContaining(
        "oxlint-plugin-react-doctor 0.9.18 is older"
      ),
      status: "fail",
    });
    expect(findCheck(checks, "eslint-plugin-github version")).toBeUndefined();
  });

  test("checks the package a wrapper plugin takes its rules from", () => {
    // pnpm links each package out of its store, next to its own
    // dependencies, so the wrapper's copy isn't in the project's node_modules.
    const store = cwdPath(
      "node_modules",
      ".pnpm",
      "eslint-plugin-react-doctor@0.9.21",
      "node_modules"
    );

    const files = pluginProject(eslintConfig("core", "react"), {
      ...pinnedPlugins(eslintCoreDevDependencies),
      ...pinnedPlugins(eslintFrameworkDevDependencies.react),
    });

    files[nodePath.join(store, "oxlint-plugin-react-doctor", "package.json")] =
      manifest("oxlint-plugin-react-doctor", "0.9.18");

    const checks = pluginChecks("eslint", files, {
      [cwdPath("node_modules", "eslint-plugin-react-doctor")]: nodePath.join(
        store,
        "eslint-plugin-react-doctor"
      ),
    });

    expect(
      findCheck(checks, "oxlint-plugin-react-doctor version")
    ).toMatchObject({
      message: expect.stringContaining(
        "loads its rules from oxlint-plugin-react-doctor 0.9.18"
      ),
      status: "fail",
    });
  });

  test("only warns about plugin versions it can't read under Yarn Plug'n'Play", () => {
    const files = pluginProject(oxlintConfig("full"), {});

    files[cwdPath(".pnp.cjs")] = "";

    const checks = pluginChecks("oxlint", files);

    expect(findCheck(checks, "Plugin versions")).toMatchObject({
      message: expect.stringContaining("Yarn Plug'n'Play"),
      status: "warn",
    });
    expect(checks.filter((check) => check.status === "fail")).toEqual([]);
  });
});
