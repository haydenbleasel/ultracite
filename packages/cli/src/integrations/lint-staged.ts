import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { addDevDependency, dlxCommand } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";
import YAML from "yaml";

import { parsePackageJson } from "../schemas";
import { exists, isMonorepo } from "../utils";

const createLintStagedConfig = (packageManager: PackageManagerName) => ({
  "*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}": [
    dlxCommand(packageManager, "ultracite", {
      args: ["fix"],
      short: packageManager === "npm",
    }),
  ],
});

// Check for existing configuration files in order of preference
const configFiles = [
  "./package.json",
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

// Check if project uses ESM
const isProjectEsm = async (): Promise<boolean> => {
  try {
    const content = await readFile("./package.json", "utf-8");
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
  const content = await readFile("./package.json", "utf-8");
  const packageJson = parsePackageJson(content);

  // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
  if (!packageJson) {
    return;
  }

  packageJson["lint-staged"] = packageJson["lint-staged"]
    ? deepmerge(
        packageJson["lint-staged"],
        createLintStagedConfig(packageManager)
      )
    : createLintStagedConfig(packageManager);

  await writeFile(
    "./package.json",
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

  const mergedConfig = deepmerge(
    existingConfig,
    createLintStagedConfig(packageManager)
  );
  await writeFile(filename, `${JSON.stringify(mergedConfig, null, 2)}\n`);
};

// Quote unquoted glob pattern keys that YAML would misinterpret as aliases or tags
const quoteGlobKeys = (content: string): string =>
  content.replaceAll(
    /^([*?{[][^\n:]*):(.*)$/gm,
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

  const mergedConfig = deepmerge(
    existingConfig,
    createLintStagedConfig(packageManager)
  );
  await writeFile(filename, YAML.stringify(mergedConfig));
};

// Update ESM config files
const updateEsmConfig = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  const fileUrl = pathToFileURL(filename).href;
  const imported = await import(fileUrl);
  const existingConfig = imported.default || {};
  const mergedConfig = deepmerge(
    existingConfig,
    createLintStagedConfig(packageManager)
  );

  const esmContent = `export default ${JSON.stringify(mergedConfig, null, 2)};
`;
  await writeFile(filename, esmContent);
};

// Update CommonJS config files
const updateCjsConfig = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  // Use dynamic import with cache-busting query to avoid stale modules
  const fileUrl = `${pathToFileURL(filename).href}?t=${Date.now()}`;
  const imported = await import(fileUrl);
  const existingConfig = imported.default || imported;
  const mergedConfig = deepmerge(
    existingConfig,
    createLintStagedConfig(packageManager)
  );

  const cjsContent = `module.exports = ${JSON.stringify(mergedConfig, null, 2)};
`;
  await writeFile(filename, cjsContent);
};

// Create fallback config file
const createFallbackConfig = async (
  packageManager: PackageManagerName
): Promise<void> => {
  await writeFile(
    ".lintstagedrc.json",
    `${JSON.stringify(createLintStagedConfig(packageManager), null, 2)}\n`
  );
};

// Handle updating different config file types
const handleConfigFileUpdate = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  if (filename === "./package.json") {
    await updatePackageJson(packageManager);
    return;
  }

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
    await writeFile(
      ".lintstagedrc.json",
      `${JSON.stringify(createLintStagedConfig(packageManager), null, 2)}\n`
    );
  },
  exists: () => {
    for (const file of configFiles) {
      if (exists(file)) {
        return true;
      }
    }

    return false;
  },
  install: async (packageManager: PackageManager) => {
    await addDevDependency("lint-staged", {
      corepack: false,
      packageManager,
      silent: true,
      workspace: isMonorepo(),
    });
  },
  update: async (packageManager: PackageManagerName) => {
    let existingConfigFile: string | null = null;

    for (const file of configFiles) {
      if (exists(file)) {
        existingConfigFile = file;
        break;
      }
    }

    // If no config file found, create a fallback config
    if (!existingConfigFile) {
      await createFallbackConfig(packageManager);
      return;
    }

    await handleConfigFileUpdate(existingConfigFile, packageManager);
  },
};
