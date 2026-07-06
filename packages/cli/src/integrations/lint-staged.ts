import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
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
const hasUltraciteCommand = (config: unknown): boolean =>
  JSON.stringify(config).includes("ultracite");

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

// Update ESM config files
const updateEsmConfig = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  const fileUrl = pathToFileURL(filename).href;
  // oxlint-disable-next-line react-doctor/no-dynamic-import-path -- intentionally loading the user's config file at runtime; the path is not statically known
  const imported = await import(fileUrl);
  const existingConfig = imported.default || {};

  if (hasUltraciteCommand(existingConfig)) {
    return;
  }

  const mergedConfig = deepmerge(
    existingConfig,
    createLintStagedConfig(packageManager)
  );

  const esmContent = `export default ${JSON.stringify(mergedConfig, null, 2)};
`;
  await writeProjectFile(filename, esmContent);
};

// Update CommonJS config files
const updateCjsConfig = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  // Use dynamic import with cache-busting query to avoid stale modules
  const fileUrl = `${pathToFileURL(filename).href}?t=${Date.now()}`;
  // oxlint-disable-next-line react-doctor/no-dynamic-import-path -- intentionally loading the user's config file at runtime; the path is not statically known
  const imported = await import(fileUrl);
  const existingConfig = imported.default || imported;

  if (hasUltraciteCommand(existingConfig)) {
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
