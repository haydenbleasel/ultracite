import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { log } from "@clack/prompts";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { generateCode, parseModule } from "magicast";
import { addDevDependency, dlxCommand } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";
import YAML from "yaml";

import { parsePackageJson } from "../schemas";
import { exists, isMonorepo, writeProjectFile } from "../utils";

const packageJsonPath = "./package.json";

const createLintStagedConfig = (packageManager: PackageManagerName) => ({
  "*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}": [
    dlxCommand(packageManager, "ultracite", {
      args: ["fix"],
      short: packageManager === "npm",
    }),
  ],
});

// Check for existing dedicated configuration files in order of preference.
// package.json is handled separately — it only counts as lint-staged config
// when it actually has a "lint-staged" key.
const configFiles = [
  "./.lintstagedrc.json",
  "./.lintstagedrc.js",
  "./.lintstagedrc.cjs",
  "./.lintstagedrc.mjs",
  "./lint-staged.config.js",
  "./lint-staged.config.cjs",
  "./lint-staged.config.mjs",
  "./.lintstagedrc.yaml",
  "./.lintstagedrc.yml",
  "./.lintstagedrc",
];

// deepmerge concatenates arrays, so re-running init would append another
// ultracite command on every run — skip configs that already reference it
// JSON.stringify returns undefined for a top-level function config, so guard
// the includes call.
const hasUltraciteCommand = (config: unknown): boolean =>
  JSON.stringify(config)?.includes("ultracite") ?? false;

// Function-valued entries are a documented lint-staged pattern, but they
// can't survive a JSON.stringify round-trip — rewriting such a config would
// silently delete the user's functions.
const containsFunction = (value: unknown): boolean => {
  if (typeof value === "function") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsFunction(entry));
  }
  if (value && typeof value === "object") {
    return Object.values(value).some((entry) => containsFunction(entry));
  }
  return false;
};

const warnUnmergeableConfig = (filename: string): void => {
  log.warn(
    `${filename} contains function-based entries that can't be merged automatically. Add "npx ultracite fix" (or your package manager's equivalent) to it manually.`
  );
};

const readPackageJsonLintStaged = async (): Promise<unknown> => {
  try {
    const content = await readFile(packageJsonPath, "utf-8");
    const packageJson = parsePackageJson(content);
    return packageJson?.["lint-staged"];
  } catch {
    return undefined;
  }
};

// Check if project uses ESM
const isProjectEsm = async (): Promise<boolean> => {
  try {
    const content = await readFile(packageJsonPath, "utf-8");
    const packageJson = parsePackageJson(content);
    return packageJson?.type === "module";
  } catch {
    return false;
  }
};

// Update package.json lint-staged config
const updatePackageJson = async (
  packageManager: PackageManagerName
): Promise<void> => {
  const content = await readFile(packageJsonPath, "utf-8");
  const packageJson = parsePackageJson(content);

  // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
  if (!packageJson) {
    return;
  }

  if (hasUltraciteCommand(packageJson["lint-staged"])) {
    return;
  }

  packageJson["lint-staged"] = packageJson["lint-staged"]
    ? deepmerge(
        packageJson["lint-staged"],
        createLintStagedConfig(packageManager)
      )
    : createLintStagedConfig(packageManager);

  await writeProjectFile(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`
  );
};

// Update JSON config files
const updateJsonConfig = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  const content = await readFile(filename, "utf-8");
  const existingConfig = parse(content) as Record<string, unknown> | undefined;

  // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
  if (!existingConfig) {
    return;
  }

  if (hasUltraciteCommand(existingConfig)) {
    return;
  }

  const mergedConfig = deepmerge(
    existingConfig,
    createLintStagedConfig(packageManager)
  );
  await writeProjectFile(
    filename,
    `${JSON.stringify(mergedConfig, null, 2)}\n`
  );
};

// Quote unquoted glob pattern keys that YAML would misinterpret as aliases or tags
const quoteGlobKeys = (content: string): string =>
  content.replaceAll(
    /^(?<key>[*?{[][^\n:]*):(?<rest>.*)$/gmu,
    (_match, key: string, rest: string) => `'${key}':${rest}`
  );

// Update YAML config files
const updateYamlConfig = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  const raw = await readFile(filename, "utf-8");
  const content = quoteGlobKeys(raw);

  let existingConfig: Record<string, unknown> | undefined;
  try {
    existingConfig = YAML.parse(content) as Record<string, unknown> | undefined;
  } catch {
    // If parsing fails (invalid YAML), treat as empty config and proceed gracefully
    return;
  }

  if (!existingConfig) {
    return;
  }

  if (hasUltraciteCommand(existingConfig)) {
    return;
  }

  const mergedConfig = deepmerge(
    existingConfig,
    createLintStagedConfig(packageManager)
  );
  await writeProjectFile(filename, YAML.stringify(mergedConfig));
};

// Update ESM config files. magicast edits the module's AST in place, so
// comments and function-valued entries elsewhere in the config survive the
// update — the previous import()-and-serialize approach destroyed both.
const updateEsmConfig = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  const content = await readFile(filename, "utf-8");

  if (content.includes("ultracite")) {
    return;
  }

  const mod = parseModule(content);

  const [entry] = Object.entries(createLintStagedConfig(packageManager));
  const [pattern, commands] = entry as [string, string[]];

  try {
    const config = mod.exports.default;

    if (config === undefined) {
      // No default export to merge into — add one with just our entry.
      mod.exports.default = { [pattern]: commands };
    } else if (config.$type === "object") {
      const existing = config[pattern];

      if (existing === undefined) {
        config[pattern] = commands;
      } else if (Array.isArray(existing)) {
        existing.push(...commands);
      } else {
        // A function or other non-array value owns our pattern; replacing it
        // would delete the user's config.
        warnUnmergeableConfig(filename);
        return;
      }
    } else {
      // e.g. `export default defineConfig(...)` or a function config.
      warnUnmergeableConfig(filename);
      return;
    }
  } catch {
    // magicast can't proxy every node kind (some template literals, etc.).
    warnUnmergeableConfig(filename);
    return;
  }

  const { code } = generateCode(mod);
  await writeProjectFile(filename, code.endsWith("\n") ? code : `${code}\n`);
};

// Update CommonJS config files
const updateCjsConfig = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  // Use dynamic import with cache-busting query to avoid stale modules
  const fileUrl = `${pathToFileURL(filename).href}?t=${Date.now()}`;
  // Intentionally loading the user's config file at runtime; the path is not statically known
  const imported = await import(fileUrl);
  const existingConfig = imported.default || imported;

  if (hasUltraciteCommand(existingConfig)) {
    return;
  }

  if (containsFunction(existingConfig)) {
    warnUnmergeableConfig(filename);
    return;
  }

  const mergedConfig = deepmerge(
    existingConfig,
    createLintStagedConfig(packageManager)
  );

  const cjsContent = `module.exports = ${JSON.stringify(mergedConfig, null, 2)};
`;
  await writeProjectFile(filename, cjsContent);
};

// Create fallback config file
const createFallbackConfig = async (
  packageManager: PackageManagerName
): Promise<void> => {
  await writeProjectFile(
    ".lintstagedrc.json",
    `${JSON.stringify(createLintStagedConfig(packageManager), null, 2)}\n`
  );
};

// Handle updating different config file types
const handleConfigFileUpdate = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  if (filename.endsWith(".json") || filename === "./.lintstagedrc") {
    await updateJsonConfig(filename, packageManager);
    return;
  }

  if (filename.endsWith(".yaml") || filename.endsWith(".yml")) {
    await updateYamlConfig(filename, packageManager);
    return;
  }

  const isEsm = await isProjectEsm();

  if (filename.endsWith(".mjs") || (filename.endsWith(".js") && isEsm)) {
    try {
      await updateEsmConfig(filename, packageManager);
    } catch {
      await createFallbackConfig(packageManager);
    }
    return;
  }

  if (filename.endsWith(".cjs") || (filename.endsWith(".js") && !isEsm)) {
    try {
      await updateCjsConfig(filename, packageManager);
    } catch {
      await createFallbackConfig(packageManager);
    }
  }
};

export const lintStaged = {
  create: async (packageManager: PackageManagerName) => {
    await writeProjectFile(
      ".lintstagedrc.json",
      `${JSON.stringify(createLintStagedConfig(packageManager), null, 2)}\n`
    );
  },
  exists: async () => {
    if (await readPackageJsonLintStaged()) {
      return true;
    }

    return configFiles.some((file) => exists(file));
  },
  install: async (packageManager: PackageManager) => {
    await addDevDependency("lint-staged", {
      corepack: false,
      packageManager,
      silent: true,
      // npm's `--workspaces` installs in every workspace package; we want a
      // root install, which is the default when no flag is passed.
      workspace: isMonorepo() && packageManager.name !== "npm",
    });
  },
  update: async (packageManager: PackageManagerName) => {
    // package.json only wins when it actually holds the lint-staged config —
    // otherwise a dedicated config file would shadow whatever we write there
    if (await readPackageJsonLintStaged()) {
      await updatePackageJson(packageManager);
      return;
    }

    const existingConfigFile = configFiles.find((file) => exists(file));

    // If no config file found, create a fallback config
    if (!existingConfigFile) {
      await createFallbackConfig(packageManager);
      return;
    }

    await handleConfigFileUpdate(existingConfigFile, packageManager);
  },
};
