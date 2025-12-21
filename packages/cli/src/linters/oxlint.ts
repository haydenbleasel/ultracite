import { readFile, writeFile } from "node:fs/promises";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import type { options } from "../consts/options";
import { exists } from "../utils";

const oxlintConfigPath = "./.oxlintrc.json";

interface OxlintOptions {
  frameworks?: (typeof options.frameworks)[number][];
}

const defaultConfig = {
  $schema: "./node_modules/oxlint/configuration_schema.json",
  extends: ["ultracite/oxlint/core"],
};

export const oxlint = {
  exists: async () => {
    return exists(oxlintConfigPath);
  },
  create: async (opts?: OxlintOptions) => {
    const extendsList = ["ultracite/oxlint/core"];

    // Add framework-specific configs
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        extendsList.push(`ultracite/oxlint/${framework}`);
      }
    }

    const config = {
      ...defaultConfig,
      extends: extendsList,
    };

    return writeFile(oxlintConfigPath, JSON.stringify(config, null, 2));
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

    const newExtends = [...existingExtends];

    // Add ultracite/oxlint/core if not present
    if (!newExtends.includes("ultracite/oxlint/core")) {
      newExtends.push("ultracite/oxlint/core");
    }

    // Add framework-specific configs if provided
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        const frameworkConfig = `ultracite/oxlint/${framework}`;
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

    await writeFile(oxlintConfigPath, JSON.stringify(newConfig, null, 2));
  },
};
