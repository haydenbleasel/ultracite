import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { prettierCleanup } from "../src/migrations/prettier";

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

describe("prettierCleanup", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("hasPrettier", () => {
    test("returns true when prettier is in dependencies", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() =>
          Promise.resolve('{"devDependencies": {"prettier": "2.0.0"}}')
        ),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await prettierCleanup.hasPrettier();
      expect(result).toBe(true);
    });

    test("returns true when prettier config file exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".prettierrc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await prettierCleanup.hasPrettier();
      expect(result).toBe(true);
    });

    test("returns false when prettier is not found", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await prettierCleanup.hasPrettier();
      expect(result).toBe(false);
    });
  });

  describe("remove", () => {
    test("removes prettier packages", async () => {
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
            '{"devDependencies": {"prettier": "2.0.0", "prettier-plugin-tailwind": "1.0.0"}}'
          )
        ),
        writeFile: mock(() => Promise.resolve()),
        unlink: mock(() => Promise.resolve()),
      }));

      const result = await prettierCleanup.remove("npm");

      expect(result.packagesRemoved).toContain("prettier");
      expect(result.packagesRemoved).toContain("prettier-plugin-tailwind");
      expect(mockRemoveDep).toHaveBeenCalled();
    });

    test("removes prettier config files", async () => {
      const mockUnlink = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".prettierrc") {
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

      const result = await prettierCleanup.remove("npm");

      expect(result.filesRemoved).toContain(".prettierrc");
      expect(mockUnlink).toHaveBeenCalled();
    });

    test("cleans VSCode prettier settings", async () => {
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
              '{"editor.defaultFormatter": "esbenp.prettier-vscode"}'
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

      const result = await prettierCleanup.remove("npm");

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

      const result = await prettierCleanup.remove("npm");

      expect(result.vsCodeCleaned).toBe(false);
    });

    test("removes language-specific prettier formatters", async () => {
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
              '{"[javascript]": {"editor.defaultFormatter": "esbenp.prettier-vscode"}}'
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

      const result = await prettierCleanup.remove("npm");

      expect(result.vsCodeCleaned).toBe(true);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("removes empty language-specific settings after cleaning", async () => {
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
            // Use [javascript] instead of [typescript] because the code only checks for keys containing "javascript"
            return Promise.resolve(
              '{"[javascript]": {"editor.defaultFormatter": "esbenp.prettier-vscode"}, "editor.tabSize": 2}'
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

      const result = await prettierCleanup.remove("npm");

      expect(result.vsCodeCleaned).toBe(true);
      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      // Verify other settings are preserved
      expect(writtenContent["editor.tabSize"]).toBe(2);
      // Verify the empty language-specific setting was removed
      expect(writtenContent["[javascript]"]).toBeUndefined();
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

      const result = await prettierCleanup.remove("npm");

      expect(result.vsCodeCleaned).toBe(false);
    });

    test("handles errors when removing config files", async () => {
      const consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {
        // noop
      });

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".prettierrc") {
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

      const result = await prettierCleanup.remove("npm");

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
          Promise.resolve('{"devDependencies": {"prettier": "2.0.0"}}')
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

      const result = await prettierCleanup.remove("npm");

      // Should handle error gracefully
      expect(result.packagesRemoved).toContain("prettier");
      consoleWarnSpy.mockRestore();
    });
  });
});
