import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { addDevDependency, dlxCommand, type PackageManagerName } from "nypm";
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

// Helper function to process YAML lines
const processYamlLine = (
  line: string,
  result: Record<string, unknown>,
  currentKey: string | null,
  currentArray: string[]
): { newCurrentKey: string | null; newCurrentArray: string[] } => {
  const trimmed = line.trim();

  if (trimmed.includes(":") && !trimmed.startsWith("-")) {
    // Save previous array if exists
    if (currentKey && currentArray.length > 0) {
      result[currentKey] = currentArray;
    }

    const [key, ...valueParts] = trimmed.split(":");
    const value = valueParts.join(":").trim();
    const newCurrentKey = key.trim().replace(/['"]/g, "");

    if (value && value !== "") {
      if (value.startsWith("[") && value.endsWith("]")) {
        // Handle inline arrays
        result[newCurrentKey] = value
          .slice(1, -1)
          .split(",")
          .map((v) => v.trim().replace(/['"]/g, ""));
      } else {
        result[newCurrentKey] = value.replace(/['"]/g, "");
      }
      return { newCurrentKey: null, newCurrentArray: [] };
    }
    return { newCurrentKey, newCurrentArray: [] };
  }

  if (trimmed.startsWith("-") && currentKey) {
    const newCurrentArray = [
      ...currentArray,
      trimmed.slice(1).trim().replace(/['"]/g, ""),
    ];
    return { newCurrentKey: currentKey, newCurrentArray };
  }

  return { newCurrentKey: currentKey, newCurrentArray: currentArray };
};

// Simple YAML parser for basic objects (limited but functional)
const parseSimpleYaml = (content: string): Record<string, unknown> => {
  const lines = content
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("#"));
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  for (const line of lines) {
    const processed = processYamlLine(line, result, currentKey, currentArray);
    currentKey = processed.newCurrentKey;
    currentArray = processed.newCurrentArray;
  }

  // Save final array if exists
  if (currentKey && currentArray.length > 0) {
    result[currentKey] = currentArray;
  }

  return result;
};

// Convert object to simple YAML format
const stringifySimpleYaml = (obj: Record<string, unknown>): string => {
  let yaml = "";
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      yaml += `${key}:\n`;
      for (const item of value) {
        yaml += `  - '${item}'\n`;
      }
    } else {
      yaml += `${key}: '${value}'\n`;
    }
  }
  return yaml;
};

// Check if project uses ESM
const isProjectEsm = async (): Promise<boolean> => {
  try {
    const packageJson = parse(await readFile("./package.json", "utf-8")) as
      | Record<string, unknown>
      | undefined;

    if (!packageJson) {
      return false;
    }

    return packageJson.type === "module";
  } catch {
    return false;
  }
};

// Update package.json lint-staged config
const updatePackageJson = async (
  packageManager: PackageManagerName
): Promise<void> => {
  const packageJson = parse(await readFile("./package.json", "utf-8")) as
    | Record<string, unknown>
    | undefined;

  // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
  if (!packageJson) {
    return;
  }

  if (packageJson["lint-staged"]) {
    packageJson["lint-staged"] = deepmerge(
      packageJson["lint-staged"],
      createLintStagedConfig(packageManager)
    );
  } else {
    packageJson["lint-staged"] = createLintStagedConfig(packageManager);
  }

  await writeFile("./package.json", JSON.stringify(packageJson, null, 2));
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
  await writeFile(filename, JSON.stringify(mergedConfig, null, 2));
};

// Update YAML config files
const updateYamlConfig = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  const content = await readFile(filename, "utf-8");
  const existingConfig = parseSimpleYaml(content) as
    | Record<string, unknown>
    | undefined;

  // If parsing fails (invalid YAML), treat as empty config and proceed gracefully
  if (!existingConfig) {
    return;
  }

  const mergedConfig = deepmerge(
    existingConfig,
    createLintStagedConfig(packageManager)
  );
  await writeFile(filename, stringifySimpleYaml(mergedConfig));
};

// Update ESM config files
const updateEsmConfig = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  const fileUrl = pathToFileURL(filename).href;
  const module = await import(fileUrl);
  const existingConfig = module.default || {};
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
  // For CommonJS, we need to be more careful about imports
  // Let's create a temporary file and require it
  delete require.cache[require.resolve(`./${filename}`)];
  const existingConfig = require(`./${filename}`);
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
    JSON.stringify(createLintStagedConfig(packageManager), null, 2)
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
  exists: async () => {
    for (const file of configFiles) {
      if (await exists(file)) {
        return true;
      }
    }

    return false;
  },
  install: async (packageManager: PackageManagerName) => {
    await addDevDependency("lint-staged", {
      packageManager,
      workspace: await isMonorepo(),
    });
  },
  create: async (packageManager: PackageManagerName) => {
    await writeFile(
      ".lintstagedrc.json",
      JSON.stringify(createLintStagedConfig(packageManager), null, 2)
    );
  },
  update: async (packageManager: PackageManagerName) => {
    let existingConfigFile: string | null = null;

    for (const file of configFiles) {
      if (await exists(file)) {
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
