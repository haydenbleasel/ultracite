import { mkdir, readFile, writeFile } from "node:fs/promises";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { exists } from "../../utils";
import { defaultConfig } from "./default-config";

const path = "./.zed/settings.json";

export const zed = {
  exists: () => exists(path),
  create: async () => {
    await mkdir(".zed", { recursive: true });
    await writeFile(path, JSON.stringify(defaultConfig, null, 2));
  },
  update: async () => {
    const existingContents = await readFile(path, "utf-8");
    const existingConfig = parse(existingContents) as
      | Record<string, unknown>
      | undefined;

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToMerge = existingConfig || {};
    const newConfig = deepmerge(configToMerge, defaultConfig);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
