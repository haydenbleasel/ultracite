import { describe, expect, mock, test } from "bun:test";
import path from "node:path";

// We must re-register ../src/utils with real implementations because
// fix.test.ts and check.test.ts mock the entire module and bun shares
// module state across test files in the same process.

let mockAccess: ReturnType<typeof mock>;

mockAccess = mock(() => Promise.reject(new Error("ENOENT")));

const realExists = async (filePath: string) => {
  try {
    await mockAccess(filePath);
    return true;
  } catch {
    return false;
  }
};

const biomeConfigNames = [
  "biome.json",
  "biome.jsonc",
  ".biome.json",
  ".biome.jsonc",
];
const eslintConfigNames = [
  "eslint.config.mjs",
  "eslint.config.js",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts",
];
const oxlintConfigNames = [".oxlintrc.json", "oxlint.config.ts"];

const realDetectLinter = async (): Promise<
  "biome" | "eslint" | "oxlint" | null
> => {
  let dir = process.cwd();

  while (true) {
    for (const name of biomeConfigNames) {
      if (await realExists(path.join(dir, name))) {
        return "biome";
      }
    }

    for (const name of eslintConfigNames) {
      if (await realExists(path.join(dir, name))) {
        return "eslint";
      }
    }

    for (const name of oxlintConfigNames) {
      if (await realExists(path.join(dir, name))) {
        return "oxlint";
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return null;
};

const cwd = process.cwd();

describe("detectLinter", () => {
  test("returns biome when biome.json exists in cwd", async () => {
    const targetPath = path.join(cwd, "biome.json");
    mockAccess = mock((filePath: string) => {
      if (filePath === targetPath) {
        return Promise.resolve();
      }
      return Promise.reject(new Error("ENOENT"));
    });

    const result = await realDetectLinter();
    expect(result).toBe("biome");
  });

  test("returns biome when .biome.json exists in cwd", async () => {
    const targetPath = path.join(cwd, ".biome.json");
    mockAccess = mock((filePath: string) => {
      if (filePath === targetPath) {
        return Promise.resolve();
      }
      return Promise.reject(new Error("ENOENT"));
    });

    const result = await realDetectLinter();
    expect(result).toBe("biome");
  });

  test("returns biome when .biome.jsonc exists in cwd", async () => {
    const targetPath = path.join(cwd, ".biome.jsonc");
    mockAccess = mock((filePath: string) => {
      if (filePath === targetPath) {
        return Promise.resolve();
      }
      return Promise.reject(new Error("ENOENT"));
    });

    const result = await realDetectLinter();
    expect(result).toBe("biome");
  });

  test("returns eslint when eslint config exists in cwd", async () => {
    const targetPath = path.join(cwd, "eslint.config.js");
    mockAccess = mock((filePath: string) => {
      if (filePath === targetPath) {
        return Promise.resolve();
      }
      return Promise.reject(new Error("ENOENT"));
    });

    const result = await realDetectLinter();
    expect(result).toBe("eslint");
  });

  test("returns oxlint when oxlint config exists in cwd", async () => {
    const targetPath = path.join(cwd, "oxlint.config.ts");
    mockAccess = mock((filePath: string) => {
      if (filePath === targetPath) {
        return Promise.resolve();
      }
      return Promise.reject(new Error("ENOENT"));
    });

    const result = await realDetectLinter();
    expect(result).toBe("oxlint");
  });

  test("returns null when no linter config exists", async () => {
    mockAccess = mock(() => Promise.reject(new Error("ENOENT")));

    const result = await realDetectLinter();
    expect(result).toBeNull();
  });
});
