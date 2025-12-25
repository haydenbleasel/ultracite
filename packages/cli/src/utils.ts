import { access, readFile, writeFile } from "node:fs/promises";
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
export const parseFilePaths = (files: string[]): string[] => {
  return files.map((file) => {
    // Check if the path needs escaping (contains special shell characters)
    if (SPECIAL_CHARS_PATTERN.test(file)) {
      // Escape single quotes by replacing ' with '\'' and wrap in single quotes
      return `'${file.replace(SINGLE_QUOTE_PATTERN, "'\\''")}' `;
    }
    return file;
  });
};
