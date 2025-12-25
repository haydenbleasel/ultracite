import { mkdir, readFile, writeFile } from "node:fs/promises";
import { type Linter, getZedConfig } from "@ultracite/data/editors";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { exists } from "../../utils";

const path = "./.zed/settings.json";

export const zed = {
  exists: () => exists(path),
  create: async (linters: Linter[] = ["biome"]) => {
    await mkdir(".zed", { recursive: true });
    const config = getZedConfig(linters);
    await writeFile(path, JSON.stringify(config, null, 2));
  },
  update: async (linters: Linter[] = ["biome"]) => {
    const existingContents = await readFile(path, "utf-8");
    const existingConfig = parse(existingContents) as
      | Record<string, unknown>
      | undefined;

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToMerge = existingConfig || {};
    const defaultConfig = getZedConfig(linters);
    const newConfig = deepmerge(configToMerge, defaultConfig);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
