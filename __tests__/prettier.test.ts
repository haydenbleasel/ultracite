import { readFile, unlink, writeFile } from "node:fs/promises";
import { removeDependency } from "nypm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prettierCleanup } from "../scripts/migrations/prettier";
import { exists } from "../scripts/utils";

vi.mock("nypm");
vi.mock("node:fs/promises");
vi.mock("../scripts/utils", () => ({
  exists: vi.fn(),
}));

describe("prettier-cleanup", () => {
  const mockRemoveDependency = vi.mocked(removeDependency);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockUnlink = vi.mocked(unlink);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasPrettier", () => {
    it("should return true when prettier dependencies exist", async () => {
      const packageJson = {
        devDependencies: {
          prettier: "^2.0.0",
          "eslint-plugin-prettier": "^4.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));

      const result = await prettierCleanup.hasPrettier();

      expect(result).toBe(true);
      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf-8");
    });

    it("should return true when prettier-prefixed packages exist", async () => {
      const packageJson = {
        devDependencies: {
          "prettier-plugin-tailwindcss": "^0.1.0",
          "prettier-plugin-svelte": "^2.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));

      const result = await prettierCleanup.hasPrettier();

      expect(result).toBe(true);
    });

    it("should return false when prettier is in package name but not at start", async () => {
      const packageJson = {
        devDependencies: {
          "remark-preset-prettier": "^1.0.0",
          "some-other-prettier-tool": "^1.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));
      mockExists.mockResolvedValue(false);

      const result = await prettierCleanup.hasPrettier();

      expect(result).toBe(false);
    });

    it("should return true when prettier config files exist", async () => {
      mockReadFile.mockRejectedValue(new Error("No package.json"));
      mockExists.mockImplementation(
        async (path: string) => path === ".prettierrc"
      );

      const result = await prettierCleanup.hasPrettier();

      expect(result).toBe(true);
    });

    it("should return false when no prettier dependencies or config files exist", async () => {
      const packageJson = {
        devDependencies: {
          typescript: "^4.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));
      mockExists.mockResolvedValue(false);

      const result = await prettierCleanup.hasPrettier();

      expect(result).toBe(false);
    });
  });

  describe("remove", () => {
    it("should remove prettier dependencies and config files", async () => {
      const packageJson = {
        devDependencies: {
          prettier: "^2.0.0",
          "eslint-plugin-prettier": "^4.0.0",
          typescript: "^4.0.0",
        },
      };

      mockReadFile.mockImplementation(
        async (path: Parameters<typeof readFile>[0]) => {
          if (path === "package.json") {
            return JSON.stringify(packageJson);
          }
          return await Promise.resolve("{}");
        }
      );

      mockExists.mockImplementation(
        async (path: Parameters<typeof exists>[0]) =>
          path === ".prettierrc" || path === ".prettierignore"
      );

      mockUnlink.mockResolvedValue();
      mockRemoveDependency.mockResolvedValue();

      const result = await prettierCleanup.remove("npm");

      expect(result.packagesRemoved).toEqual([
        "prettier",
        "eslint-plugin-prettier",
      ]);
      expect(result.filesRemoved).toEqual([".prettierrc", ".prettierignore"]);
      expect(mockRemoveDependency).toHaveBeenCalledWith("prettier", {
        packageManager: "npm",
      });
      expect(mockRemoveDependency).toHaveBeenCalledWith(
        "eslint-plugin-prettier",
        {
          packageManager: "npm",
        }
      );
      expect(mockUnlink).toHaveBeenCalledWith(".prettierrc");
      expect(mockUnlink).toHaveBeenCalledWith(".prettierignore");
    });

    it("should only remove packages that start with prettier", async () => {
      const packageJson = {
        devDependencies: {
          prettier: "^2.0.0",
          "prettier-plugin-tailwindcss": "^0.1.0",
          "remark-preset-prettier": "^1.0.0", // Should NOT be removed
          "eslint-plugin-prettier": "^4.0.0",
          typescript: "^4.0.0",
        },
      };

      mockReadFile.mockImplementation(
        async (path: Parameters<typeof readFile>[0]) => {
          if (path === "package.json") {
            return JSON.stringify(packageJson);
          }
          return await Promise.resolve("{}");
        }
      );

      mockExists.mockResolvedValue(false);
      mockRemoveDependency.mockResolvedValue();

      const result = await prettierCleanup.remove("npm");

      // Should only include packages that start with 'prettier' or are in the specific exceptions list
      expect(result.packagesRemoved).toEqual([
        "prettier",
        "prettier-plugin-tailwindcss",
        "eslint-plugin-prettier",
      ]);
      expect(mockRemoveDependency).toHaveBeenCalledWith("prettier", {
        packageManager: "npm",
      });
      expect(mockRemoveDependency).toHaveBeenCalledWith(
        "prettier-plugin-tailwindcss",
        {
          packageManager: "npm",
        }
      );
      expect(mockRemoveDependency).toHaveBeenCalledWith(
        "eslint-plugin-prettier",
        {
          packageManager: "npm",
        }
      );
    });

    it("should handle different package managers", async () => {
      mockReadFile.mockResolvedValue(
        '{"devDependencies":{"prettier":"^2.0.0"}}'
      );
      mockExists.mockResolvedValue(false);
      mockRemoveDependency.mockResolvedValue();

      await prettierCleanup.remove("pnpm");

      expect(mockRemoveDependency).toHaveBeenCalledWith("prettier", {
        packageManager: "pnpm",
      });
    });

    it("should clean VS Code settings", async () => {
      const vscodeSettings = {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "prettier.enable": true,
        "typescript.tsdk": "node_modules/typescript/lib",
      };

      mockReadFile.mockImplementation(
        async (path: Parameters<typeof readFile>[0]) => {
          if (path === "package.json") {
            return await Promise.resolve("{}");
          }
          if (path === "./.vscode/settings.json") {
            return JSON.stringify(vscodeSettings);
          }
          return await Promise.resolve("{}");
        }
      );

      mockExists.mockImplementation(
        async (path: string) => path === "./.vscode/settings.json"
      );

      const result = await prettierCleanup.remove("npm");

      expect(result.vsCodeCleaned).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.vscode/settings.json",
        JSON.stringify(
          {
            "typescript.tsdk": "node_modules/typescript/lib",
          },
          null,
          2
        )
      );
    });

    it("should handle execution errors gracefully", async () => {
      mockReadFile.mockResolvedValue(
        '{"devDependencies":{"prettier":"^2.0.0"}}'
      );
      mockExists.mockResolvedValue(false);
      mockRemoveDependency.mockRejectedValue(new Error("Command failed"));

      const result = await prettierCleanup.remove("npm");

      expect(result.packagesRemoved).toEqual(["prettier"]);
      expect(result.filesRemoved).toEqual([]);
      expect(result.vsCodeCleaned).toBe(false);
    });

    it("should clean VS Code settings with prettier in language formatters", async () => {
      const vscodeSettings = {
        "[javascriptreact][typescriptreact]": {
          "editor.defaultFormatter": "esbenp.prettier-vscode",
          "editor.wordWrap": "on",
        },
        "editor.formatOnSave": true,
      };

      mockReadFile.mockImplementation(
        async (path: Parameters<typeof readFile>[0]) => {
          if (path === "package.json") {
            return await Promise.resolve("{}");
          }
          if (path === "./.vscode/settings.json") {
            const result = JSON.stringify(vscodeSettings);

            return await Promise.resolve(result);
          }
          return await Promise.resolve("{}");
        }
      );

      mockExists.mockImplementation(
        async (path: string) => path === "./.vscode/settings.json"
      );

      const result = await prettierCleanup.remove("npm");

      expect(result.vsCodeCleaned).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.vscode/settings.json",
        JSON.stringify(
          {
            "[javascriptreact][typescriptreact]": {
              "editor.wordWrap": "on",
            },
            "editor.formatOnSave": true,
          },
          null,
          2
        )
      );
    });

    it("should handle VS Code settings read error gracefully", async () => {
      mockReadFile.mockImplementation(
        async (path: Parameters<typeof readFile>[0]) => {
          if (path === "package.json") {
            return await Promise.resolve("{}");
          }
          if (path === "./.vscode/settings.json") {
            throw new Error("File read error");
          }
          return await Promise.resolve("{}");
        }
      );

      mockExists.mockImplementation(
        async (path: string) => path === "./.vscode/settings.json"
      );

      const result = await prettierCleanup.remove("npm");

      // Should handle error gracefully and return false for vsCodeCleaned
      expect(result.vsCodeCleaned).toBe(false);
    });

    it("should handle when VS Code settings don't need changes", async () => {
      const vscodeSettings = {
        "editor.formatOnSave": true,
        "typescript.tsdk": "node_modules/typescript/lib",
      };

      mockReadFile.mockImplementation(
        async (path: Parameters<typeof readFile>[0]) => {
          if (path === "package.json") {
            return await Promise.resolve("{}");
          }
          if (path === "./.vscode/settings.json") {
            return JSON.stringify(vscodeSettings);
          }
          return await Promise.resolve("{}");
        }
      );

      mockExists.mockImplementation(
        async (path: string) => path === "./.vscode/settings.json"
      );

      const result = await prettierCleanup.remove("npm");

      // Should return false since no changes were made
      expect(result.vsCodeCleaned).toBe(false);
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
