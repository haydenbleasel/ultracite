import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";

import { parse } from "jsonc-parser";

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
    const pkgJson = parse(await readFile("package.json", "utf-8")) as
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
  const packageJsonContent = await readFile("package.json", "utf-8");
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

export const ensureDirectory = async (path: string) => {
  const dir = dirname(path);
  if (dir !== ".") {
    const cleanDir = dir.startsWith("./") ? dir.slice(2) : dir;
    await mkdir(cleanDir, { recursive: true });
  }
};

export type Linter = "biome" | "eslint" | "oxlint";

// Config file names for each linter
const biomeConfigNames = ["biome.json", "biome.jsonc"] as const;

const eslintConfigNames = [
  "eslint.config.mjs",
  "eslint.config.js",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts",
] as const;

const oxlintConfigNames = [
  ".oxlintrc.json",
  ".oxlintrc.mjs",
  "oxlint.config.ts",
];

export const detectLinter = async (): Promise<Linter | null> => {
  let dir = process.cwd();

  while (true) {
    // Check for biome config
    for (const name of biomeConfigNames) {
      if (await exists(join(dir, name))) {
        return "biome";
      }
    }

    // Check for eslint config
    for (const name of eslintConfigNames) {
      if (await exists(join(dir, name))) {
        return "eslint";
      }
    }

    // Check for oxlint config
    for (const name of oxlintConfigNames) {
      if (await exists(join(dir, name))) {
        return "oxlint";
      }
    }

    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return null;
};
