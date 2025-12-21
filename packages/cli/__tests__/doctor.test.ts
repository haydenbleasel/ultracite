import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { doctor } from "../src/commands/doctor";

mock.module("node:child_process", () => ({
  spawnSync: mock(() => ({ status: 0, stdout: "v1.0.0" })),
  execSync: mock(() => ""),
}));

mock.module("node:fs", () => ({
  existsSync: mock(() => false),
}));

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("nypm", () => ({
  detectPackageManager: mock(async () => ({ name: "npm" })),
  dlxCommand: mock(
    (_pm, pkg, opts) =>
      `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
  ),
}));

describe("doctor", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("passes when everything is configured correctly", async () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {
      // noop
    });

    mock.module("node:child_process", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
      execSync: mock(() => ""),
    }));

    mock.module("node:fs", () => ({
      existsSync: mock((path: string) => {
        const pathStr = String(path);
        return (
          pathStr.includes("biome.json") || pathStr.includes("package.json")
        );
      }),
    }));

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock((path: string) => {
        const pathStr = String(path);
        if (pathStr.includes("biome.json")) {
          return Promise.resolve('{"extends": ["ultracite/biome/core"]}');
        }
        if (pathStr.includes("package.json")) {
          return Promise.resolve('{"devDependencies": {"ultracite": "1.0.0"}}');
        }
        return Promise.resolve("{}");
      }),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));

    await doctor();

    // Doctor should complete without calling process.exit if successful
    consoleLogSpy.mockRestore();
  });

  test("fails when Biome is not installed", async () => {
    mock.module("node:child_process", () => ({
      spawnSync: mock(() => ({ status: 1, stdout: "" })),
      execSync: mock(() => ""),
    }));

    mock.module("node:fs", () => ({
      existsSync: mock(() => false),
    }));

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve("{}")),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));

    await expect(doctor()).rejects.toThrow("Doctor checks failed");
  });

  test("warns when conflicting tools are present", async () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {
      // noop
    });

    mock.module("node:child_process", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
      execSync: mock(() => ""),
    }));

    mock.module("node:fs", () => ({
      existsSync: mock((path: string) => {
        const pathStr = String(path);
        return (
          pathStr.includes(".prettierrc") ||
          pathStr.includes("biome.json") ||
          pathStr.includes("package.json")
        );
      }),
    }));

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock((path: string) => {
        const pathStr = String(path);
        if (pathStr.includes("biome.json")) {
          return Promise.resolve('{"extends": ["ultracite/biome/core"]}');
        }
        return Promise.resolve('{"devDependencies": {"ultracite": "1.0.0"}}');
      }),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));

    await doctor();

    // Doctor should complete without error exit even with warnings
    consoleLogSpy.mockRestore();
  });

  test("fails when biome config is missing", async () => {
    mock.module("node:child_process", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
      execSync: mock(() => ""),
    }));

    mock.module("node:fs", () => ({
      existsSync: mock(() => false),
    }));

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve("{}")),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));

    await expect(doctor()).rejects.toThrow("Doctor checks failed");
  });

  test("warns when biome config exists but does not extend ultracite", async () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {
      // noop
    });

    mock.module("node:child_process", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
      execSync: mock(() => ""),
    }));

    mock.module("node:fs", () => ({
      existsSync: mock((path: string) => {
        const pathStr = String(path);
        return (
          pathStr.includes("biome.json") || pathStr.includes("package.json")
        );
      }),
    }));

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock((path: string) => {
        const pathStr = String(path);
        if (pathStr.includes("biome.json")) {
          return Promise.resolve('{"formatter": {"indentStyle": "space"}}');
        }
        return Promise.resolve('{"devDependencies": {"ultracite": "1.0.0"}}');
      }),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));

    await doctor();

    consoleLogSpy.mockRestore();
  });

  test("fails when biome config cannot be parsed", async () => {
    mock.module("node:child_process", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
      execSync: mock(() => ""),
    }));

    mock.module("node:fs", () => ({
      existsSync: mock((path: string) => {
        const pathStr = String(path);
        return pathStr.includes("biome.jsonc");
      }),
    }));

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock((path: string) => {
        const pathStr = String(path);
        if (pathStr.includes("biome.jsonc")) {
          throw new Error("Read error");
        }
        return Promise.resolve("{}");
      }),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));

    await expect(doctor()).rejects.toThrow("Doctor checks failed");
  });

  test("warns when package.json is missing", async () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {
      // noop
    });

    mock.module("node:child_process", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
      execSync: mock(() => ""),
    }));

    mock.module("node:fs", () => ({
      existsSync: mock((path: string) => {
        const pathStr = String(path);
        return pathStr.includes("biome.json");
      }),
    }));

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock((path: string) => {
        const pathStr = String(path);
        if (pathStr.includes("biome.json")) {
          return Promise.resolve('{"extends": ["ultracite/biome/core"]}');
        }
        if (pathStr.includes("package.json")) {
          throw new Error("File not found");
        }
        return Promise.resolve("{}");
      }),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));

    await doctor();

    consoleLogSpy.mockRestore();
  });

  test("warns when ultracite package cannot be parsed from package.json", async () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {
      // noop
    });

    mock.module("node:child_process", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
      execSync: mock(() => ""),
    }));

    mock.module("node:fs", () => ({
      existsSync: mock((path: string) => {
        const pathStr = String(path);
        return (
          pathStr.includes("biome.json") || pathStr.includes("package.json")
        );
      }),
    }));

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock((path: string) => {
        const pathStr = String(path);
        if (pathStr.includes("biome.json")) {
          return Promise.resolve('{"extends": ["ultracite/biome/core"]}');
        }
        if (pathStr.includes("package.json")) {
          return Promise.resolve("invalid json {");
        }
        return Promise.resolve("{}");
      }),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));

    await doctor();

    consoleLogSpy.mockRestore();
  });

  test("warns when ultracite is not in package.json dependencies", async () => {
    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {
      // noop
    });

    mock.module("node:child_process", () => ({
      spawnSync: mock(() => ({ status: 0, stdout: "1.0.0" })),
      execSync: mock(() => ""),
    }));

    mock.module("node:fs", () => ({
      existsSync: mock((path: string) => {
        const pathStr = String(path);
        return (
          pathStr.includes("biome.json") || pathStr.includes("package.json")
        );
      }),
    }));

    mock.module("node:fs/promises", () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock((path: string) => {
        const pathStr = String(path);
        if (pathStr.includes("biome.json")) {
          return Promise.resolve('{"extends": ["ultracite/biome/core"]}');
        }
        if (pathStr.includes("package.json")) {
          // Package.json without ultracite in dependencies or devDependencies
          return Promise.resolve(
            '{"name": "test", "dependencies": {}, "devDependencies": {}}'
          );
        }
        return Promise.resolve("{}");
      }),
      writeFile: mock(() => Promise.resolve()),
    }));

    mock.module("nypm", () => ({
      detectPackageManager: mock(async () => ({ name: "npm" })),
      dlxCommand: mock(
        (_pm, pkg, opts) =>
          `npx${pkg ? ` ${pkg}` : ""}${opts?.args ? ` ${opts.args.join(" ")}` : ""}`
      ),
    }));

    await doctor();

    consoleLogSpy.mockRestore();
  });
});
