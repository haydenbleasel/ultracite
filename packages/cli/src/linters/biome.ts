import { readFile, writeFile } from "node:fs/promises";

import type { options } from "@repo/data/options";
import deepmerge from "deepmerge";

import { biomeConfigSchema, parseJsonc } from "../schemas";
import { exists, validateFrameworkName } from "../utils";

const defaultConfig = {
  $schema: "./node_modules/@biomejs/biome/configuration_schema.json",
  extends: ["ultracite/biome/core"],
};

const getBiomeConfigPath = (): string => {
  // Check for biome.json first, then fall back to biome.jsonc
  if (exists("./biome.json")) {
    return "./biome.json";
  }
  return "./biome.jsonc";
};

interface BiomeOptions {
  frameworks?: (typeof options.frameworks)[number][];
  typeAware?: boolean;
}

export const biome = {
  create: (opts?: BiomeOptions) => {
    const path = getBiomeConfigPath();
    const extendsList = ["ultracite/biome/core"];

    // Add type-aware config for project/scanner rules
    if (opts?.typeAware) {
      extendsList.push("ultracite/biome/type-aware");
    }

    // Add framework-specific configs
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        const name = validateFrameworkName(framework);
        extendsList.push(`ultracite/biome/${name}`);
      }
    }

    const config = {
      ...defaultConfig,
      extends: extendsList,
    };

    return writeFile(path, `${JSON.stringify(config, null, 2)}\n`);
  },
  exists: () => {
    const path = getBiomeConfigPath();
    return exists(path);
  },
  update: async (opts?: BiomeOptions) => {
    const path = getBiomeConfigPath();
    const existingContents = await readFile(path, "utf-8");
    const existingConfig = parseJsonc(existingContents, biomeConfigSchema);

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToWork = existingConfig || {};

    // Check if ultracite is already in the extends array
    const existingExtends = configToWork.extends ?? [];

    // Remove legacy ultracite/core entry and replace with ultracite/biome/core
    const newExtends = existingExtends.filter(
      (ext) => ext !== "ultracite/core"
    );

    // Add ultracite/biome/core if not present
    if (!newExtends.includes("ultracite/biome/core")) {
      newExtends.push("ultracite/biome/core");
    }

    // Add type-aware config for project/scanner rules
    if (opts?.typeAware && !newExtends.includes("ultracite/biome/type-aware")) {
      newExtends.push("ultracite/biome/type-aware");
    }

    // Add framework-specific configs if provided
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        const name = validateFrameworkName(framework);
        const frameworkConfig = `ultracite/biome/${name}`;
        if (!newExtends.includes(frameworkConfig)) {
          newExtends.push(frameworkConfig);
        }
      }
    }

    configToWork.extends = newExtends;

    // Merge other properties from defaultConfig
    const configToMerge = {
      $schema: defaultConfig.$schema,
    };
    const newConfig = deepmerge(configToWork, configToMerge);

    await writeFile(path, `${JSON.stringify(newConfig, null, 2)}\n`);
  },
};
