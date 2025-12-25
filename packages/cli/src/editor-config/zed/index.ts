import { mkdir, readFile, writeFile } from "node:fs/promises";
import { getZedConfig } from "@ultracite/data/editors";
import type { Linter } from "@ultracite/data/providers";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { exists } from "../../utils";

const path = "./.zed/settings.json";

export const zed = {
  exists: () => exists(path),
  create: async (linter: Linter = "biome") => {
    await mkdir(".zed", { recursive: true });
    const config = getZedConfig(linter);
    await writeFile(path, JSON.stringify(config, null, 2));
  },
  update: async (linter: Linter = "biome") => {
    const existingContents = await readFile(path, "utf-8");
    const existingConfig = parse(existingContents) as
      | Record<string, unknown>
      | undefined;

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToMerge = existingConfig || {};
    const defaultConfig = getZedConfig(linter);
    const newConfig = deepmerge(configToMerge, defaultConfig);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
