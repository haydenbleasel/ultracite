import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { exists } from "../../utils";
import { getDefaultConfig } from "./default-config";

type Linter = "biome" | "eslint" | "oxlint";

const path = "./.vscode/settings.json";

export const vscode = {
  exists: () => exists(path),
  create: async (linters: Linter[] = ["biome"]) => {
    await mkdir(".vscode", { recursive: true });
    const config = getDefaultConfig(linters);
    await writeFile(path, JSON.stringify(config, null, 2));
  },
  update: async (linters: Linter[] = ["biome"]) => {
    const existingContents = await readFile(path, "utf-8");
    const existingConfig = parse(existingContents) as
      | Record<string, unknown>
      | undefined;

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToMerge = existingConfig || {};
    const defaultConfig = getDefaultConfig(linters);
    const newConfig = deepmerge(configToMerge, defaultConfig);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
  extension: (extensionId = "biomejs.biome") =>
    spawnSync(`code --install-extension ${extensionId}`, {
      stdio: "pipe",
      shell: true,
    }),
};
