import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getEditorById } from "@ultracite/data/editors";
import type { Linter } from "@ultracite/data/providers";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { exists } from "./utils";

export const createEditorConfig = (editorId: string, linter: Linter = "biome") => {
  const editor = getEditorById(editorId);
  if (!editor) {
    throw new Error(`Editor "${editorId}" not found`);
  }

  const { path: configPath, getContent, extensionCommand } = editor.config;
  const content = getContent(linter);

  const ensureDirectory = async () => {
    const dir = dirname(configPath);
    if (dir !== ".") {
      const cleanDir = dir.startsWith("./") ? dir.slice(2) : dir;
      await mkdir(cleanDir, { recursive: true });
    }
  };

  return {
    exists: () => exists(configPath),

    create: async () => {
      await ensureDirectory();
      await writeFile(configPath, JSON.stringify(content, null, 2));
    },

    update: async () => {
      await ensureDirectory();

      if (!(await exists(configPath))) {
        await writeFile(configPath, JSON.stringify(content, null, 2));
        return;
      }

      const existingContents = await readFile(configPath, "utf-8");
      const existingConfig = parse(existingContents) as
        | Record<string, unknown>
        | undefined;

      // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
      const configToMerge = existingConfig || {};
      const newConfig = deepmerge(configToMerge, content);

      await writeFile(configPath, JSON.stringify(newConfig, null, 2));
    },

    extension: extensionCommand
      ? (extensionId: string) =>
          spawnSync(`${extensionCommand} ${extensionId}`, {
            stdio: "pipe",
            shell: true,
          })
      : undefined,
  };
};
