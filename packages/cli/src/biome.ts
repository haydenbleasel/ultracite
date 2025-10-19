import { readFile, writeFile } from "node:fs/promises";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import type { options } from "./consts/options";
import { exists } from "./utils";

const defaultConfig = {
  $schema: "./node_modules/@biomejs/biome/configuration_schema.json",
  extends: ["ultracite"],
};

const getBiomeConfigPath = async (): Promise<string> => {
  // Check for biome.json first, then fall back to biome.jsonc
  if (await exists("./biome.json")) {
    return "./biome.json";
  }
  return "./biome.jsonc";
};

type BiomeOptions = {
  frameworks?: (typeof options.frameworks)[number][];
};

export const biome = {
  exists: async () => {
    const path = await getBiomeConfigPath();
    return exists(path);
  },
  create: async (opts?: BiomeOptions) => {
    const path = await getBiomeConfigPath();
    const extendsList = ["ultracite"];

    // Add framework-specific configs
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        extendsList.push(`ultracite/${framework}`);
      }
    }

    const config = {
      ...defaultConfig,
      extends: extendsList,
    };

    return writeFile(path, JSON.stringify(config, null, 2));
  },
  update: async (opts?: BiomeOptions) => {
    const path = await getBiomeConfigPath();
    const existingContents = await readFile(path, "utf-8");
    const existingConfig = parse(existingContents) as
      | Record<string, unknown>
      | undefined;

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToWork = existingConfig || {};

    // Check if ultracite is already in the extends array
    const existingExtends =
      configToWork.extends && Array.isArray(configToWork.extends)
        ? configToWork.extends
        : [];

    const newExtends = [...existingExtends];

    // Add ultracite if not present
    if (!newExtends.includes("ultracite")) {
      newExtends.push("ultracite");
    }

    // Add framework-specific configs if provided
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        const frameworkConfig = `ultracite/${framework}`;
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

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
