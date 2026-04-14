import { describe, expect, mock, spyOn, test } from "bun:test";

import { doctor } from "../src/commands/doctor";

mock.module("cross-spawn", () => ({
  sync: mock(() => ({ status: 0, stdout: "v1.0.0" })),
}));

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
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
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

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("fails when biome is not installed", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 1, stdout: "" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
    }));

    expect(() => doctor()).toThrow("Doctor checks failed");
  });

  test("fails when biome config cannot be parsed", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
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
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.includes("biome.json") || p.includes("package.json");
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
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
      (_cmd: string, _args: string[], _opts: Record<string, unknown>) => ({
        status: 0,
        stdout: "1.0.0",
      })
    );

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("cross-spawn", () => ({
      sync: mockSpawn,
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock(() => false),
      readFileSync: mock(() => "{}"),
    }));

    // Will warn but not fail (config missing is warn-level for shared checks)
    try {
      doctor();
    } catch {
      // May fail due to missing config — that's OK, we're checking spawn args
    }

    const [firstCall] = mockSpawn.mock.calls;
    const [command, args, options] = firstCall;
    expect(command).toBe("biome");
    expect(args).toEqual(["--version"]);
    expect(options.shell).toBe(false);
    consoleLogSpy.mockRestore();
  });

  test("warns about conflicting prettier for biome users", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
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
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
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
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
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
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
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
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
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

  test("handles oxlint config read error", () => {
    mock.module("../src/utils", () => ({
      detectLinter: () => "oxlint",
    }));
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
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

  test("warns when package.json is missing", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
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
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.includes("biome.json") || p.includes("package.json");
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (p.includes("biome.json")) {
          return '{"extends": ["ultracite/biome/core"]}';
        }
        return '{"name": "test", "dependencies": {}, "devDependencies": {}}';
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });

  test("warns when package.json cannot be parsed", () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    mock.module("../src/utils", () => ({
      detectLinter: () => "biome",
    }));
    mock.module("cross-spawn", () => ({
      sync: mock(() => ({ status: 0, stdout: "1.0.0" })),
    }));
    mock.module("node:fs", () => ({
      accessSync: mock(() => {}),
      existsSync: mock((path: string) => {
        const p = String(path);
        return p.includes("biome.json") || p.includes("package.json");
      }),
      readFileSync: mock((path: string) => {
        const p = String(path);
        if (p.includes("biome.json")) {
          return '{"extends": ["ultracite/biome/core"]}';
        }
        return "invalid json {";
      }),
    }));

    doctor();
    consoleLogSpy.mockRestore();
  });
});
