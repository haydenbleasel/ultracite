import { readFile, unlink, writeFile } from "node:fs/promises";
import { removeDependency } from "nypm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prettierCleanup } from "../src/migrations/prettier";
import { exists } from "../src/utils";

vi.mock("nypm");
vi.mock("node:fs/promises");
vi.mock("../src/utils", () => ({
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
    it("should return true when prettier is in package name", async () => {
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

    it("should return false when package.json is invalid", async () => {
      mockReadFile.mockResolvedValue("null");
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

    it("should remove all packages that contain prettier", async () => {
      const packageJson = {
        devDependencies: {
          prettier: "^2.0.0",
          "prettier-plugin-tailwindcss": "^0.1.0",
          "remark-preset-prettier": "^1.0.0",
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

      // Should include all packages that contain 'prettier'
      expect(result.packagesRemoved).toEqual([
        "prettier",
        "prettier-plugin-tailwindcss",
        "remark-preset-prettier",
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
        "remark-preset-prettier",
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
      // The prettier formatter should be removed but other settings should remain
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

    it("should remove empty language formatter config after removing prettier", async () => {
      const vscodeSettings = {
        "[javascript]": {
          "editor.defaultFormatter": "esbenp.prettier-vscode",
        },
        "editor.formatOnSave": true,
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
      // The language config should be completely removed since it only had the prettier formatter
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.vscode/settings.json",
        JSON.stringify(
          {
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

    it("should handle invalid VS Code settings gracefully", async () => {
      mockReadFile.mockImplementation(
        async (path: Parameters<typeof readFile>[0]) => {
          if (path === "package.json") {
            return await Promise.resolve("{}");
          }
          if (path === "./.vscode/settings.json") {
            return await Promise.resolve("null");
          }
          return await Promise.resolve("{}");
        }
      );

      mockExists.mockImplementation(
        async (path: string) => path === "./.vscode/settings.json"
      );

      const result = await prettierCleanup.remove("npm");

      // Should handle invalid config gracefully
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

    it("should handle file deletion errors gracefully", async () => {
      const packageJson = {
        devDependencies: {
          prettier: "^2.0.0",
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
        async (path: string) => path === ".prettierrc"
      );

      mockUnlink.mockRejectedValue(new Error("Permission denied"));
      mockRemoveDependency.mockResolvedValue();

      const result = await prettierCleanup.remove("npm");

      // Should continue despite file deletion error
      expect(result.packagesRemoved).toEqual(["prettier"]);
      // File wasn't removed due to error, but error was caught
      expect(result.filesRemoved).toEqual([]);
      expect(mockUnlink).toHaveBeenCalledWith(".prettierrc");
    });

    it("should remove language-specific prettier formatter from empty config", async () => {
      const vscodeSettings = {
        "[javascript]": {
          "editor.defaultFormatter": "esbenp.prettier-vscode",
        },
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
      // The language config becomes empty after removing prettier, so the entire config is empty
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.vscode/settings.json",
        JSON.stringify({}, null, 2)
      );
    });

    it("should remove empty language config object from settings", async () => {
      const vscodeSettings = {
        "[javascript]": {
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
      // The language config should have the prettier formatter removed but keep wordWrap
      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain("editor.wordWrap");
      expect(writtenContent).not.toContain("esbenp.prettier-vscode");
    });
  });
});
