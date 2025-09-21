import { readFile, unlink, writeFile } from "node:fs/promises";
import { removeDependency } from "nypm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eslintCleanup } from "../scripts/migrations/eslint";
import { exists } from "../scripts/utils";

vi.mock("nypm");
vi.mock("node:fs/promises");
vi.mock("../scripts/utils", () => ({
  exists: vi.fn(),
}));

describe("eslint-cleanup", () => {
  const mockRemoveDependency = vi.mocked(removeDependency);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockUnlink = vi.mocked(unlink);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasESLint", () => {
    it("should return true when eslint dependencies exist", async () => {
      const packageJson = {
        devDependencies: {
          eslint: "^8.0.0",
          "@typescript-eslint/parser": "^5.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));

      const result = await eslintCleanup.hasESLint();

      expect(result).toBe(true);
      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf-8");
    });

    it("should return true when eslint-prefixed packages exist", async () => {
      const packageJson = {
        devDependencies: {
          "eslint-plugin-github": "^4.0.0",
          "eslint-config-fbjs": "^3.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));

      const result = await eslintCleanup.hasESLint();

      expect(result).toBe(true);
    });

    it("should return false when eslint is in package name but not at start", async () => {
      const packageJson = {
        devDependencies: {
          "some-other-eslint-tool": "^1.0.0",
          "remark-preset-eslint": "^1.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));
      mockExists.mockResolvedValue(false);

      const result = await eslintCleanup.hasESLint();

      expect(result).toBe(false);
    });

    it("should return true when eslint config files exist", async () => {
      mockReadFile.mockRejectedValue(new Error("No package.json"));
      mockExists.mockImplementation(
        async (path: string) => path === ".eslintrc.js"
      );

      const result = await eslintCleanup.hasESLint();

      expect(result).toBe(true);
    });

    it("should return false when no eslint dependencies or config files exist", async () => {
      const packageJson = {
        devDependencies: {
          typescript: "^4.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(packageJson));
      mockExists.mockResolvedValue(false);

      const result = await eslintCleanup.hasESLint();

      expect(result).toBe(false);
    });
  });

  describe("remove", () => {
    it("should remove eslint dependencies and config files", async () => {
      const packageJson = {
        devDependencies: {
          eslint: "^8.0.0",
          "@typescript-eslint/parser": "^5.0.0",
          typescript: "^4.0.0",
        },
      };

      mockReadFile.mockImplementation(async (path: string) => {
        if (path === "package.json") {
          return JSON.stringify(packageJson);
        }
        return "{}";
      });

      mockExists.mockImplementation(
        async (path: string) =>
          path === ".eslintrc.js" || path === ".eslintignore"
      );

      mockUnlink.mockResolvedValue();
      mockRemoveDependency.mockResolvedValue();

      const result = await eslintCleanup.remove("npm");

      expect(result.packagesRemoved).toEqual([
        "eslint",
        "@typescript-eslint/parser",
      ]);
      expect(result.filesRemoved).toEqual([".eslintrc.js", ".eslintignore"]);
      expect(mockRemoveDependency).toHaveBeenCalledWith("eslint", {
        packageManager: "npm",
      });
      expect(mockRemoveDependency).toHaveBeenCalledWith(
        "@typescript-eslint/parser",
        {
          packageManager: "npm",
        }
      );
      expect(mockUnlink).toHaveBeenCalledWith(".eslintrc.js");
      expect(mockUnlink).toHaveBeenCalledWith(".eslintignore");
    });

    it("should only remove packages that start with eslint", async () => {
      const packageJson = {
        devDependencies: {
          eslint: "^8.0.0",
          "eslint-plugin-github": "^4.0.0",
          "eslint-config-fbjs": "^3.0.0",
          "some-other-eslint-tool": "^1.0.0", // Should NOT be removed
          "@typescript-eslint/parser": "^5.0.0",
          typescript: "^4.0.0",
        },
      };

      mockReadFile.mockImplementation(async (path: string) => {
        if (path === "package.json") {
          return JSON.stringify(packageJson);
        }
        return "{}";
      });

      mockExists.mockResolvedValue(false);
      mockRemoveDependency.mockResolvedValue();

      const result = await eslintCleanup.remove("npm");

      // Should only include packages that start with 'eslint' or are in the specific exceptions list
      expect(result.packagesRemoved).toEqual([
        "eslint",
        "eslint-plugin-github",
        "eslint-config-fbjs",
        "@typescript-eslint/parser",
      ]);
      expect(mockRemoveDependency).toHaveBeenCalledWith("eslint", {
        packageManager: "npm",
      });
      expect(mockRemoveDependency).toHaveBeenCalledWith(
        "eslint-plugin-github",
        {
          packageManager: "npm",
        }
      );
      expect(mockRemoveDependency).toHaveBeenCalledWith("eslint-config-fbjs", {
        packageManager: "npm",
      });
      expect(mockRemoveDependency).toHaveBeenCalledWith(
        "@typescript-eslint/parser",
        {
          packageManager: "npm",
        }
      );
    });

    it("should handle different package managers", async () => {
      mockReadFile.mockResolvedValue('{"devDependencies":{"eslint":"^8.0.0"}}');
      mockExists.mockResolvedValue(false);
      mockRemoveDependency.mockResolvedValue();

      await eslintCleanup.remove("yarn");

      expect(mockRemoveDependency).toHaveBeenCalledWith("eslint", {
        packageManager: "yarn",
      });
    });

    it("should clean VS Code settings", async () => {
      const vscodeSettings = {
        "eslint.enable": true,
        "eslint.format.enable": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": true,
          "source.organizeImports.biome": "explicit",
        },
        "typescript.tsdk": "node_modules/typescript/lib",
      };

      mockReadFile.mockImplementation(async (path: string) => {
        if (path === "package.json") {
          return "{}";
        }
        if (path === "./.vscode/settings.json") {
          return JSON.stringify(vscodeSettings);
        }
        return "{}";
      });

      mockExists.mockImplementation(
        async (path: string) => path === "./.vscode/settings.json"
      );

      const result = await eslintCleanup.remove("npm install");

      expect(result.vsCodeCleaned).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.vscode/settings.json",
        JSON.stringify(
          {
            "editor.codeActionsOnSave": {
              "source.organizeImports.biome": "explicit",
            },
            "typescript.tsdk": "node_modules/typescript/lib",
          },
          null,
          2
        )
      );
    });

    it("should handle execution errors gracefully", async () => {
      mockReadFile.mockResolvedValue('{"devDependencies":{"eslint":"^8.0.0"}}');
      mockExists.mockResolvedValue(false);
      mockRemoveDependency.mockRejectedValue(new Error("Command failed"));

      const result = await eslintCleanup.remove("npm");

      expect(result.packagesRemoved).toEqual(["eslint"]);
      expect(result.filesRemoved).toEqual([]);
      expect(result.vsCodeCleaned).toBe(false);
    });

    it("should remove empty codeActionsOnSave object from VS Code settings", async () => {
      const vscodeSettings = {
        "eslint.enable": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": true,
        },
        "typescript.tsdk": "node_modules/typescript/lib",
      };

      mockReadFile.mockImplementation(async (path: string) => {
        if (path === "package.json") {
          return "{}";
        }
        if (path === "./.vscode/settings.json") {
          return JSON.stringify(vscodeSettings);
        }
        return "{}";
      });

      mockExists.mockImplementation(
        async (path: string) => path === "./.vscode/settings.json"
      );

      const result = await eslintCleanup.remove("npm install");

      expect(result.vsCodeCleaned).toBe(true);

      // The codeActionsOnSave should be removed entirely since it would be empty
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

    it("should handle VS Code settings with only eslint codeActionsOnSave", async () => {
      const vscodeSettings = {
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": true,
          "source.organizeImports.eslint": true,
        },
      };

      mockReadFile.mockImplementation(async (path: string) => {
        if (path === "package.json") {
          return "{}";
        }
        if (path === "./.vscode/settings.json") {
          return JSON.stringify(vscodeSettings);
        }
        return "{}";
      });

      mockExists.mockImplementation(
        async (path: string) => path === "./.vscode/settings.json"
      );

      const result = await eslintCleanup.remove("npm install");

      expect(result.vsCodeCleaned).toBe(true);

      // The entire codeActionsOnSave should be removed
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.vscode/settings.json",
        JSON.stringify({}, null, 2)
      );
    });

    it("should handle VS Code settings read error gracefully", async () => {
      mockReadFile.mockImplementation(async (path: string) => {
        if (path === "package.json") {
          return "{}";
        }
        if (path === "./.vscode/settings.json") {
          throw new Error("File read error");
        }
        return "{}";
      });

      mockExists.mockImplementation(
        async (path: string) => path === "./.vscode/settings.json"
      );

      const result = await eslintCleanup.remove("npm install");

      // Should handle error gracefully and return false for vsCodeCleaned
      expect(result.vsCodeCleaned).toBe(false);
    });

    it("should handle when VS Code settings don't need changes", async () => {
      const vscodeSettings = {
        "editor.formatOnSave": true,
        "typescript.tsdk": "node_modules/typescript/lib",
      };

      mockReadFile.mockImplementation(async (path: string) => {
        if (path === "package.json") {
          return "{}";
        }
        if (path === "./.vscode/settings.json") {
          return JSON.stringify(vscodeSettings);
        }
        return "{}";
      });

      mockExists.mockImplementation(
        async (path: string) => path === "./.vscode/settings.json"
      );

      const result = await eslintCleanup.remove("npm install");

      // Should return false since no changes were made
      expect(result.vsCodeCleaned).toBe(false);
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
