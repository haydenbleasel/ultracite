import { accessSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";

import type { Framework } from "@repo/data/options";
import { glob } from "glob";
import YAML from "yaml";

import type { PackageJson } from "./schemas";
import { readPackageJson, readPackageJsonSync } from "./schemas";

export const exists = (path: string): boolean => {
  try {
    accessSync(path);
    return true;
  } catch {
    return false;
  }
};

export const isMonorepo = (): boolean => {
  if (exists("pnpm-workspace.yaml")) {
    return true;
  }

  const pkgJson = readPackageJsonSync();
  if (!pkgJson) {
    return false;
  }

  return !!pkgJson.workspaces || !!pkgJson.workspace;
};

export const updatePackageJson = async ({
  dependencies,
  devDependencies,
  scripts,
  type,
}: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  type?: string;
}) => {
  const packageJsonObject = await readPackageJson();
  if (!packageJsonObject) {
    throw new Error("Failed to parse package.json: file is missing or invalid");
  }

  const newPackageJsonObject = {
    ...packageJsonObject,
  };

  if (type) {
    newPackageJsonObject.type = type;
  }

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
    `${JSON.stringify(newPackageJsonObject, null, 2)}\n`
  );
};

export const ensureDirectory = (path: string): void => {
  const dir = dirname(path);
  if (dir !== ".") {
    const cleanDir = dir.startsWith("./") ? dir.slice(2) : dir;
    mkdirSync(cleanDir, { recursive: true });
  }
};

const SAFE_IDENTIFIER = /^[a-z][a-z0-9-]*$/;

/**
 * Validates that a framework name is safe to interpolate into generated code.
 * Throws if the name contains characters outside [a-z0-9-].
 */
export const validateFrameworkName = (name: string): string => {
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(
      `Invalid framework name "${name}": must match ${SAFE_IDENTIFIER}`
    );
  }
  return name;
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

const oxlintConfigNames = [".oxlintrc.json", "oxlint.config.ts"];

// Map dep package names → framework IDs to enable. Multiple IDs cover
// meta-frameworks (e.g. Next.js implies React).
const FRAMEWORK_DEPENDENCIES: Record<string, readonly Framework[]> = {
  "@angular/core": ["angular"],
  "@builder.io/qwik": ["qwik"],
  "@nestjs/core": ["nestjs"],
  "@qwik.dev/core": ["qwik"],
  "@remix-run/node": ["remix"],
  "@remix-run/react": ["react", "remix"],
  "@tanstack/react-router": ["react", "remix"],
  astro: ["astro"],
  jest: ["jest"],
  next: ["react", "next"],
  nuxt: ["vue"],
  react: ["react"],
  "react-router": ["react", "remix"],
  "solid-js": ["solid"],
  svelte: ["svelte"],
  vitest: ["vitest"],
  vue: ["vue"],
};

const collectDeps = (pkg: PackageJson | undefined): string[] => {
  if (!pkg) {
    return [];
  }
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ];
};

const getWorkspacePatterns = async (
  rootPkg: PackageJson | undefined
): Promise<string[]> => {
  const patterns = new Set<string>();

  const ws = rootPkg?.workspaces;
  if (Array.isArray(ws)) {
    for (const pattern of ws) {
      patterns.add(pattern);
    }
  } else if (ws && typeof ws === "object") {
    const { packages } = ws as { packages?: unknown };
    if (Array.isArray(packages)) {
      for (const pattern of packages) {
        if (typeof pattern === "string") {
          patterns.add(pattern);
        }
      }
    }
  }

  if (exists("pnpm-workspace.yaml")) {
    try {
      const content = await readFile("pnpm-workspace.yaml", "utf-8");
      const parsed = YAML.parse(content) as { packages?: unknown };
      if (Array.isArray(parsed?.packages)) {
        for (const pattern of parsed.packages) {
          if (typeof pattern === "string") {
            patterns.add(pattern);
          }
        }
      }
    } catch {
      // ignore malformed pnpm-workspace.yaml
    }
  }

  return [...patterns];
};

/**
 * Scan the project's package.json (and workspace package.jsons in monorepos)
 * for known framework dependencies. Returns the framework IDs to pre-select
 * in the init prompt. Best-effort — returns whatever it can find on error.
 */
export const detectFrameworks = async (): Promise<Framework[]> => {
  const detected = new Set<Framework>();

  try {
    const rootPkg = await readPackageJson();
    const deps = new Set(collectDeps(rootPkg));

    const patterns = await getWorkspacePatterns(rootPkg);
    if (patterns.length > 0) {
      const pkgJsonPaths = await glob(
        patterns.map(
          (pattern) => `${pattern.replace(/\/+$/, "")}/package.json`
        ),
        { absolute: false, ignore: ["**/node_modules/**"] }
      );
      const workspacePkgs = await Promise.all(
        pkgJsonPaths.map((path) => readPackageJson(path))
      );
      for (const pkg of workspacePkgs) {
        for (const dep of collectDeps(pkg)) {
          deps.add(dep);
        }
      }
    }

    for (const dep of deps) {
      const frameworks = FRAMEWORK_DEPENDENCIES[dep];
      if (frameworks) {
        for (const framework of frameworks) {
          detected.add(framework);
        }
      }
    }
  } catch {
    // best-effort — fall through with whatever we collected
  }

  return [...detected];
};

export const detectLinter = (startDir = process.cwd()): Linter | null => {
  let dir = startDir;

  while (true) {
    for (const name of biomeConfigNames) {
      if (exists(join(dir, name))) {
        return "biome";
      }
    }

    for (const name of eslintConfigNames) {
      if (exists(join(dir, name))) {
        return "eslint";
      }
    }

    for (const name of oxlintConfigNames) {
      if (exists(join(dir, name))) {
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
