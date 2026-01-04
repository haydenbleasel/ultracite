import { readFile, writeFile } from "node:fs/promises";
import type { options } from "@repo/data/options";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { exists } from "../utils";

const oxlintConfigPath = "./.oxlintrc.json";

interface OxlintOptions {
  frameworks?: (typeof options.frameworks)[number][];
}

// Helper to generate the full node_modules path for oxlint configs
// Oxlint doesn't support Node.js package exports, so we need explicit paths
const getOxlintConfigPath = (name: string) =>
  `./node_modules/ultracite/config/oxlint/${name}/.oxlintrc.json`;

const defaultConfig = {
  $schema: "./node_modules/oxlint/configuration_schema.json",
  extends: [getOxlintConfigPath("core")],
};

export const oxlint = {
  exists: async () => {
    return await exists(oxlintConfigPath);
  },
  create: async (opts?: OxlintOptions) => {
    const extendsList = [getOxlintConfigPath("core")];

    // Add framework-specific configs
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        extendsList.push(getOxlintConfigPath(framework));
      }
    }

    const config = {
      ...defaultConfig,
      extends: extendsList,
    };

    return await writeFile(oxlintConfigPath, JSON.stringify(config, null, 2));
  },
  update: async (opts?: OxlintOptions) => {
    const existingContents = await readFile(oxlintConfigPath, "utf-8");
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

    // Helper to check if a config is already present
    const hasConfig = (name: string) =>
      existingExtends.some((ext: string) => ext === getOxlintConfigPath(name));

    const newExtends = [...existingExtends];

    // Add core config if not present
    if (!hasConfig("core")) {
      newExtends.push(getOxlintConfigPath("core"));
    }

    // Add framework-specific configs if provided
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        if (!hasConfig(framework)) {
          newExtends.push(getOxlintConfigPath(framework));
        }
      }
    }

    configToWork.extends = newExtends;

    // Merge other properties from defaultConfig
    const configToMerge = {
      $schema: defaultConfig.$schema,
    };
    const newConfig = deepmerge(configToWork, configToMerge);

    await writeFile(oxlintConfigPath, JSON.stringify(newConfig, null, 2));
  },
};
