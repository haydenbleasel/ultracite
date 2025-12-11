import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { eslintCleanup } from "../src/migrations/eslint";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
  unlink: mock(() => Promise.resolve()),
}));

mock.module("nypm", () => ({
  addDevDependency: mock(() => Promise.resolve()),
  dlxCommand: mock(() => "npx ultracite fix"),
  detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
  removeDependency: mock(() => Promise.resolve()),
}));

describe("eslintCleanup", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("hasEsLint", () => {
    test("returns true when eslint is in dependencies", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() =>
          Promise.resolve('{"devDependencies": {"eslint": "8.0.0"}}')
        ),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.hasEsLint();
      expect(result).toBe(true);
    });

    test("returns true when eslint config file exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".eslintrc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.hasEsLint();
      expect(result).toBe(true);
    });

    test("returns false when eslint is not found", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.hasEsLint();
      expect(result).toBe(false);
    });
  });

  describe("remove", () => {
    test("removes eslint packages", async () => {
      const mockRemoveDep = mock(() => Promise.resolve());
      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mockRemoveDep,
      }));

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() =>
          Promise.resolve(
            '{"devDependencies": {"eslint": "8.0.0", "eslint-plugin-react": "7.0.0"}}'
          )
        ),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.remove("npm");

      expect(result.packagesRemoved).toContain("eslint");
      expect(result.packagesRemoved).toContain("eslint-plugin-react");
      expect(mockRemoveDep).toHaveBeenCalled();
    });

    test("removes eslint config files", async () => {
      const mockUnlink = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".eslintrc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        unlink: mockUnlink,
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.remove("npm");

      expect(result.filesRemoved).toContain(".eslintrc");
      expect(mockUnlink).toHaveBeenCalled();
    });

    test("cleans VSCode eslint settings", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.vscode/settings.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock((path: string) => {
          if (path === "./.vscode/settings.json") {
            return Promise.resolve(
              '{"eslint.enable": true, "editor.codeActionsOnSave": {"source.fixAll.eslint": true}}'
            );
          }
          return Promise.resolve("{}");
        }),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.remove("npm");

      expect(result.vsCodeCleaned).toBe(true);
    });

    test("handles missing VSCode settings gracefully", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.remove("npm");

      expect(result.vsCodeCleaned).toBe(false);
    });

    test("removes empty codeActionsOnSave when all eslint actions are removed", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.vscode/settings.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock((path: string) => {
          if (path === "./.vscode/settings.json") {
            return Promise.resolve(
              '{"editor.codeActionsOnSave": {"source.fixAll.eslint": true}}'
            );
          }
          return Promise.resolve("{}");
        }),
        writeFile: mockWriteFile,
        unlink: mock(() => Promise.resolve()),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.remove("npm");

      expect(result.vsCodeCleaned).toBe(true);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("handles invalid VSCode settings JSON", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.vscode/settings.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock((path: string) => {
          if (path === "./.vscode/settings.json") {
            return Promise.resolve("invalid json {");
          }
          return Promise.resolve("{}");
        }),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.remove("npm");

      expect(result.vsCodeCleaned).toBe(false);
    });

    test("handles errors when removing config files", async () => {
      const consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {
        // noop
      });

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".eslintrc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => {
          throw new Error("Permission denied");
        }),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      const result = await eslintCleanup.remove("npm");

      // Should continue despite errors
      expect(result.filesRemoved.length).toBe(0);
      consoleWarnSpy.mockRestore();
    });

    test("handles errors when removing dependencies", async () => {
      const consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {
        // noop
      });

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() =>
          Promise.resolve('{"devDependencies": {"eslint": "8.0.0"}}')
        ),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock(() => "npx ultracite fix"),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        removeDependency: mock(() => {
          throw new Error("Network error");
        }),
      }));

      const result = await eslintCleanup.remove("npm");

      // Should handle error gracefully
      expect(result.packagesRemoved).toContain("eslint");
      consoleWarnSpy.mockRestore();
    });
  });
});
