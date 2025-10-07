import { access, readFile, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exists,
  isMonorepo,
  parseFilePaths,
  title,
  updatePackageJson,
} from "../src/utils";

vi.mock("node:fs/promises");

// Define regex patterns at the top level for performance
const EIGHT_PATTERN = /8+/;
const DIGIT_PATTERN = /\d+/;

describe("utils", () => {
  const mockAccess = vi.mocked(access);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("title", () => {
    it("should export the ASCII art title as a string", () => {
      expect(typeof title).toBe("string");
      expect(title).toContain("888"); // The title contains ASCII art with 888 patterns
      expect(title.trim()).toBeTruthy();
    });

    it("should contain the expected ASCII art structure", () => {
      const lines = title.trim().split("\n");
      expect(lines.length).toBeGreaterThan(1);

      // Check that it contains numbers/characters typical of ASCII art
      expect(title).toMatch(EIGHT_PATTERN);
      expect(title).toMatch(DIGIT_PATTERN);
    });

    it("should be consistently formatted", () => {
      // Ensure it starts and ends with newlines for proper display
      expect(title.startsWith("\n")).toBe(true);
      expect(title.endsWith("\n")).toBe(true);
    });
  });

  describe("exists", () => {
    it("should return true when file exists", async () => {
      mockAccess.mockResolvedValue(undefined);

      const result = await exists("existing-file.txt");

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith("existing-file.txt");
    });

    it("should return false when file does not exist", async () => {
      mockAccess.mockRejectedValue(new Error("ENOENT"));

      const result = await exists("non-existing-file.txt");

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith("non-existing-file.txt");
    });

    it("should return false when access throws any error", async () => {
      mockAccess.mockRejectedValue(new Error("Permission denied"));

      const result = await exists("protected-file.txt");

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith("protected-file.txt");
    });
  });

  describe("isMonorepo", () => {
    it("should return true when pnpm-workspace.yaml exists", async () => {
      mockAccess.mockImplementation((path) => {
        if (path === "pnpm-workspace.yaml") {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const result = await isMonorepo();

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith("pnpm-workspace.yaml");
    });

    it("should return true when package.json has workspaces", async () => {
      mockAccess.mockImplementation((path) => {
        if (path === "pnpm-workspace.yaml") {
          return Promise.reject(new Error("ENOENT"));
        }
        return Promise.resolve(undefined);
      });
      mockReadFile.mockResolvedValue(
        JSON.stringify({ workspaces: ["packages/*"] })
      );

      const result = await isMonorepo();

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith("pnpm-workspace.yaml");
      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf-8");
    });

    it("should return true when package.json has empty workspaces array", async () => {
      mockAccess.mockImplementation((path) => {
        if (path === "pnpm-workspace.yaml") {
          return Promise.reject(new Error("ENOENT"));
        }
        return Promise.resolve(undefined);
      });
      mockReadFile.mockResolvedValue(JSON.stringify({ workspaces: [] }));

      const result = await isMonorepo();

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith("pnpm-workspace.yaml");
      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf-8");
    });

    it("should return false when package.json has no workspaces", async () => {
      mockAccess.mockImplementation((path) => {
        if (path === "pnpm-workspace.yaml") {
          return Promise.reject(new Error("ENOENT"));
        }
        return Promise.resolve(undefined);
      });
      mockReadFile.mockResolvedValue(JSON.stringify({ name: "test-package" }));

      const result = await isMonorepo();

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith("pnpm-workspace.yaml");
      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf-8");
    });

    it("should return false when package.json cannot be read", async () => {
      mockAccess.mockImplementation((path) => {
        if (path === "pnpm-workspace.yaml") {
          return Promise.reject(new Error("ENOENT"));
        }
        return Promise.resolve(undefined);
      });
      mockReadFile.mockRejectedValue(new Error("File not found"));

      const result = await isMonorepo();

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith("pnpm-workspace.yaml");
      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf-8");
    });

    it("should return false when package.json is invalid JSON", async () => {
      mockAccess.mockImplementation((path) => {
        if (path === "pnpm-workspace.yaml") {
          return Promise.reject(new Error("ENOENT"));
        }
        return Promise.resolve(undefined);
      });
      mockReadFile.mockResolvedValue("invalid json");

      const result = await isMonorepo();

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith("pnpm-workspace.yaml");
      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf-8");
    });

    it("should handle JSONC files with comments in package.json", async () => {
      mockAccess.mockImplementation((path) => {
        if (path === "pnpm-workspace.yaml") {
          return Promise.reject(new Error("ENOENT"));
        }
        return Promise.resolve(undefined);
      });

      const packageJsonWithComments = `{
  // Package configuration with comments
  "name": "test-package",
  "version": "1.0.0",
  
  /* Workspaces configuration */
  "workspaces": [
    // Package directories
    "packages/*",
    "apps/*"
  ]
}`;

      mockReadFile.mockResolvedValue(packageJsonWithComments);

      const result = await isMonorepo();

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith("pnpm-workspace.yaml");
      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf-8");
    });

    it("should handle JSONC files with comments but no workspaces", async () => {
      mockAccess.mockImplementation((path) => {
        if (path === "pnpm-workspace.yaml") {
          return Promise.reject(new Error("ENOENT"));
        }
        return Promise.resolve(undefined);
      });

      const packageJsonWithComments = `{
  // Package configuration with comments
  "name": "test-package",
  "version": "1.0.0",
  
  /* Dependencies */
  "dependencies": {
    // Core dependencies
    "react": "^18.0.0"
  }
}`;

      mockReadFile.mockResolvedValue(packageJsonWithComments);

      const result = await isMonorepo();

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith("pnpm-workspace.yaml");
      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf-8");
    });

    it("should prioritize pnpm-workspace.yaml over package.json workspaces", async () => {
      mockAccess.mockResolvedValue(undefined);
      // mockReadFile should not be called when pnpm-workspace.yaml exists

      const result = await isMonorepo();

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith("pnpm-workspace.yaml");
      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });

  describe("parseFilePaths", () => {
    it("should not quote regular file paths", () => {
      const paths = ["src/index.ts", "lib/utils.js", "/home/user/file.tsx"];
      const result = parseFilePaths(paths);
      expect(result).toEqual([
        "src/index.ts",
        "lib/utils.js",
        "/home/user/file.tsx",
      ]);
    });

    it("should quote paths with spaces", () => {
      const paths = ["file with spaces.ts", "another file.js"];
      const result = parseFilePaths(paths);
      expect(result).toEqual(["'file with spaces.ts' ", "'another file.js' "]);
    });

    it("should quote paths with dollar signs", () => {
      const paths = ["$HOME/file.ts", "test/$VAR/script.js"];
      const result = parseFilePaths(paths);
      expect(result).toEqual(["'$HOME/file.ts' ", "'test/$VAR/script.js' "]);
    });

    it("should quote paths with parentheses", () => {
      const paths = ["file(1).ts", "test(copy).js", "(draft)file.tsx"];
      const result = parseFilePaths(paths);
      expect(result).toEqual([
        "'file(1).ts' ",
        "'test(copy).js' ",
        "'(draft)file.tsx' ",
      ]);
    });

    it("should quote paths with brackets", () => {
      const paths = ["[locale]/page.tsx", "file[id].ts", "test[1].js"];
      const result = parseFilePaths(paths);
      expect(result).toEqual([
        "'[locale]/page.tsx' ",
        "'file[id].ts' ",
        "'test[1].js' ",
      ]);
    });

    it("should quote paths with curly braces", () => {
      const paths = ["{slug}/page.tsx", "file{id}.ts"];
      const result = parseFilePaths(paths);
      expect(result).toEqual(["'{slug}/page.tsx' ", "'file{id}.ts' "]);
    });

    it("should escape single quotes in file paths", () => {
      const paths = ["file'with'quotes.ts", "it's-a-file.js"];
      const result = parseFilePaths(paths);
      expect(result).toEqual([
        "'file'\\''with'\\''quotes.ts' ",
        "'it'\\''s-a-file.js' ",
      ]);
    });

    it("should handle mixed special characters", () => {
      const paths = [
        "file with spaces and $VAR.ts",
        "(draft) [id] {slug}.tsx",
        "it's a complex file!.js",
      ];
      const result = parseFilePaths(paths);
      expect(result).toEqual([
        "'file with spaces and $VAR.ts' ",
        "'(draft) [id] {slug}.tsx' ",
        "'it'\\''s a complex file!.js' ",
      ]);
    });

    it("should handle Next.js route patterns", () => {
      const paths = [
        "/app/[locale]/[params]/(signedin)/@modal/(.)tickets/[ticketId]/page.tsx",
        "/app/api/[...slug]/route.ts",
      ];
      const result = parseFilePaths(paths);
      expect(result).toEqual([
        "'/app/[locale]/[params]/(signedin)/@modal/(.)tickets/[ticketId]/page.tsx' ",
        "'/app/api/[...slug]/route.ts' ",
      ]);
    });

    it("should handle empty array", () => {
      const paths: string[] = [];
      const result = parseFilePaths(paths);
      expect(result).toEqual([]);
    });

    it("should handle mix of regular and special character paths", () => {
      const paths = [
        "normal.ts",
        "file with spaces.js",
        "/regular/path/file.tsx",
        "$HOME/special.ts",
      ];
      const result = parseFilePaths(paths);
      expect(result).toEqual([
        "normal.ts",
        "'file with spaces.js' ",
        "/regular/path/file.tsx",
        "'$HOME/special.ts' ",
      ]);
    });
  });

  describe("updatePackageJson", () => {
    it("should update package.json with new dependencies", async () => {
      const existingPackageJson = {
        name: "test-package",
        version: "1.0.0",
        dependencies: {
          react: "^18.0.0",
        },
        devDependencies: {
          typescript: "^5.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingPackageJson));
      mockWriteFile.mockResolvedValue();

      await updatePackageJson({
        dependencies: {
          lodash: "^4.17.21",
        },
      });

      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf8");
      expect(mockWriteFile).toHaveBeenCalledWith(
        "package.json",
        JSON.stringify(
          {
            ...existingPackageJson,
            dependencies: {
              react: "^18.0.0",
              lodash: "^4.17.21",
            },
          },
          null,
          2
        )
      );
    });

    it("should update package.json with new devDependencies", async () => {
      const existingPackageJson = {
        name: "test-package",
        version: "1.0.0",
        dependencies: {
          react: "^18.0.0",
        },
        devDependencies: {
          typescript: "^5.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingPackageJson));
      mockWriteFile.mockResolvedValue();

      await updatePackageJson({
        devDependencies: {
          vitest: "^1.0.0",
          "@types/node": "^20.0.0",
        },
      });

      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf8");
      expect(mockWriteFile).toHaveBeenCalledWith(
        "package.json",
        JSON.stringify(
          {
            ...existingPackageJson,
            devDependencies: {
              typescript: "^5.0.0",
              vitest: "^1.0.0",
              "@types/node": "^20.0.0",
            },
          },
          null,
          2
        )
      );
    });

    it("should update both dependencies and devDependencies", async () => {
      const existingPackageJson = {
        name: "test-package",
        version: "1.0.0",
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingPackageJson));
      mockWriteFile.mockResolvedValue();

      await updatePackageJson({
        dependencies: {
          react: "^18.0.0",
        },
        devDependencies: {
          typescript: "^5.0.0",
        },
      });

      expect(mockReadFile).toHaveBeenCalledWith("package.json", "utf8");
      expect(mockWriteFile).toHaveBeenCalledWith(
        "package.json",
        JSON.stringify(
          {
            ...existingPackageJson,
            devDependencies: {
              typescript: "^5.0.0",
            },
            dependencies: {
              react: "^18.0.0",
            },
          },
          null,
          2
        )
      );
    });

    it("should handle package.json without existing dependencies", async () => {
      const existingPackageJson = {
        name: "test-package",
        version: "1.0.0",
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingPackageJson));
      mockWriteFile.mockResolvedValue();

      await updatePackageJson({
        dependencies: {
          lodash: "^4.17.21",
        },
        devDependencies: {
          vitest: "^1.0.0",
        },
      });

      expect(mockWriteFile).toHaveBeenCalledWith(
        "package.json",
        JSON.stringify(
          {
            ...existingPackageJson,
            devDependencies: {
              vitest: "^1.0.0",
            },
            dependencies: {
              lodash: "^4.17.21",
            },
          },
          null,
          2
        )
      );
    });

    it("should override existing dependencies with same names", async () => {
      const existingPackageJson = {
        name: "test-package",
        dependencies: {
          react: "^17.0.0",
          lodash: "^3.0.0",
        },
        devDependencies: {
          typescript: "^4.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingPackageJson));
      mockWriteFile.mockResolvedValue();

      await updatePackageJson({
        dependencies: {
          react: "^18.0.0",
        },
        devDependencies: {
          typescript: "^5.0.0",
        },
      });

      expect(mockWriteFile).toHaveBeenCalledWith(
        "package.json",
        JSON.stringify(
          {
            name: "test-package",
            dependencies: {
              react: "^18.0.0",
              lodash: "^3.0.0",
            },
            devDependencies: {
              typescript: "^5.0.0",
            },
          },
          null,
          2
        )
      );
    });

    it("should handle empty update objects", async () => {
      const existingPackageJson = {
        name: "test-package",
        version: "1.0.0",
        dependencies: {
          react: "^18.0.0",
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingPackageJson));
      mockWriteFile.mockResolvedValue();

      await updatePackageJson({});

      expect(mockWriteFile).toHaveBeenCalledWith(
        "package.json",
        JSON.stringify(
          {
            ...existingPackageJson,
            devDependencies: {},
          },
          null,
          2
        )
      );
    });
  });
});
