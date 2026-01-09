import { parse } from "jsonc-parser";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const exists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

export const isMonorepo = async () => {
  if (await exists("pnpm-workspace.yaml")) {
    return true;
  }

  try {
    const pkgJson = parse(await readFile("package.json", "utf8")) as
      | Record<string, unknown>
      | undefined;

    if (!pkgJson) {
      return false;
    }

    return !!pkgJson.workspaces || !!pkgJson.workspace;
  } catch {
    return false;
  }
};

export const updatePackageJson = async ({
  dependencies,
  devDependencies,
  scripts,
}: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}) => {
  const packageJsonContent = await readFile("package.json", "utf8");
  const packageJsonObject = JSON.parse(packageJsonContent);

  const newPackageJsonObject = {
    ...packageJsonObject,
  };

  // Only add devDependencies if they exist in the original package.json or are being added
  if (packageJsonObject.devDependencies || devDependencies) {
    newPackageJsonObject.devDependencies = {
      ...packageJsonObject.devDependencies,
      ...devDependencies,
    };
  }

  // Only add dependencies if they exist in the original package.json or are being added
  if (packageJsonObject.dependencies || dependencies) {
    newPackageJsonObject.dependencies = {
      ...packageJsonObject.dependencies,
      ...dependencies,
    };
  }

  // Only add scripts if they exist in the original package.json or are being added
  if (packageJsonObject.scripts || scripts) {
    newPackageJsonObject.scripts = {
      ...packageJsonObject.scripts,
      ...scripts,
    };
  }

  await writeFile(
    "package.json",
    JSON.stringify(newPackageJsonObject, null, 2)
  );
};

// Regex patterns for special characters that need escaping
const SPECIAL_CHARS_PATTERN = /[ $(){}[\]&|;<>!"'`*?#~]/;
const SINGLE_QUOTE_PATTERN = /'/g;

// Parse and escape file paths to handle special characters
export const parseFilePaths = (files: string[]): string[] =>
  files.map((file) => {
    // Check if the path needs escaping (contains special shell characters)
    if (SPECIAL_CHARS_PATTERN.test(file)) {
      // Escape single quotes by replacing ' with '\'' and wrap in single quotes
      return `'${file.replace(SINGLE_QUOTE_PATTERN, String.raw`'\''`)}' `;
    }
    return file;
  });

export const ensureDirectory = async (path: string) => {
  const dir = dirname(path);
  if (dir !== ".") {
    const cleanDir = dir.startsWith("./") ? dir.slice(2) : dir;
    await mkdir(cleanDir, { recursive: true });
  }
};

export type Linter = "biome" | "eslint" | "oxlint";

// Config file patterns for each linter
const biomeConfigPaths = ["./biome.json", "./biome.jsonc"] as const;

const eslintConfigPaths = [
  "./eslint.config.mjs",
  "./eslint.config.js",
  "./eslint.config.cjs",
  "./eslint.config.ts",
  "./eslint.config.mts",
  "./eslint.config.cts",
] as const;

const oxlintConfigPath = "./.oxlintrc.json";

export const detectLinter = async (): Promise<Linter | null> => {
  // Check for biome config
  for (const path of biomeConfigPaths) {
    if (await exists(path)) {
      return "biome";
    }
  }

  // Check for eslint config
  for (const path of eslintConfigPaths) {
    if (await exists(path)) {
      return "eslint";
    }
  }

  // Check for oxlint config
  if (await exists(oxlintConfigPath)) {
    return "oxlint";
  }

  return null;
};
