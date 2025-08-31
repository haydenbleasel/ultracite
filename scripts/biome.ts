import { readFile, writeFile } from "node:fs/promises";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import packageJson from "../package.json" with { type: "json" };
import { exists } from "./utils";

const schemaVersion = packageJson.devDependencies["@biomejs/biome"];

const defaultConfig = {
  $schema: `https://biomejs.dev/schemas/${schemaVersion}/schema.json`,
  extends: ["ultracite"],
};

const getBiomeConfigPath = async (): Promise<string> => {
  // Check for biome.json first, then fall back to biome.jsonc
  if (await exists("./biome.json")) {
    return "./biome.json";
  }
  return "./biome.jsonc";
};

export const biome = {
  exists: async () => {
    const path = await getBiomeConfigPath();
    return exists(path);
  },
  create: async () => {
    const path = await getBiomeConfigPath();
    return writeFile(path, JSON.stringify(defaultConfig, null, 2));
  },
  update: async () => {
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
    if (!existingExtends.includes("ultracite")) {
      configToWork.extends = [...existingExtends, "ultracite"];
    }

    // Merge other properties from defaultConfig
    const configToMerge = {
      $schema: defaultConfig.$schema,
    };
    const newConfig = deepmerge(configToWork, configToMerge);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
