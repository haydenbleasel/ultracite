import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { type Linter, getVscodeConfig } from "@ultracite/data/editors";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { exists } from "../../utils";

const path = "./.vscode/settings.json";

export const vscode = {
  exists: () => exists(path),
  create: async (linter: Linter = "biome") => {
    await mkdir(".vscode", { recursive: true });
    const config = getVscodeConfig(linter);
    await writeFile(path, JSON.stringify(config, null, 2));
  },
  update: async (linter: Linter = "biome") => {
    const existingContents = await readFile(path, "utf-8");
    const existingConfig = parse(existingContents) as
      | Record<string, unknown>
      | undefined;

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToMerge = existingConfig || {};
    const defaultConfig = getVscodeConfig(linter);
    const newConfig = deepmerge(configToMerge, defaultConfig);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
  extension: (extensionId = "biomejs.biome") =>
    spawnSync(`code --install-extension ${extensionId}`, {
      stdio: "pipe",
      shell: true,
    }),
};
