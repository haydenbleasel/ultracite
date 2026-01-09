import { editors } from "@repo/data/editors";
import type { Linter } from "@repo/data/providers";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

import { ensureDirectory, exists } from "./utils";

export const createEditorConfig = (
  editorId: string,
  linter: Linter = "biome"
) => {
  const editor = editors.find((editor) => editor.id === editorId);

  if (!editor) {
    throw new Error(`Editor "${editorId}" not found`);
  }

  const content = editor.config.getContent(linter);

  return {
    create: async () => {
      await ensureDirectory(editor.config.path);
      await writeFile(editor.config.path, JSON.stringify(content, null, 2));
    },

    exists: () => exists(editor.config.path),

    extension: editor.config.extensionCommand
      ? (extensionId: string) =>
          spawnSync(`${editor.config.extensionCommand} ${extensionId}`, {
            shell: true,
            stdio: "pipe",
          })
      : undefined,

    update: async () => {
      await ensureDirectory(editor.config.path);
      const doesExist = await exists(editor.config.path);

      if (!doesExist) {
        await writeFile(editor.config.path, JSON.stringify(content, null, 2));
        return;
      }

      const existingContents = await readFile(editor.config.path, "utf8");
      const existingConfig = parse(existingContents) as
        | Record<string, unknown>
        | undefined;

      // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
      const configToMerge = existingConfig || {};
      const newConfig = deepmerge(configToMerge, content);

      await writeFile(editor.config.path, JSON.stringify(newConfig, null, 2));
    },
  };
};
