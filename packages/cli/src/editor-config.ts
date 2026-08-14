import { readFile } from "node:fs/promises";

import { log } from "@clack/prompts";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";

import { editors } from "./data/editors";
import type { ProviderId } from "./data/providers";
import type { JsonObject } from "./data/types";
import { spawnSync } from "./spawn-sync";
import { ensureDirectory, exists, writeProjectFile } from "./utils";

export const createEditorConfig = (
  editorId: string,
  linter: ProviderId = "biome"
) => {
  const editor = editors.find((e) => e.id === editorId);

  if (!editor) {
    throw new Error(`Editor "${editorId}" not found`);
  }

  const content = editor.config.getContent(linter);
  const { extensionCommand } = editor.config;

  return {
    create: async () => {
      ensureDirectory(editor.config.path);
      await writeProjectFile(
        editor.config.path,
        `${JSON.stringify(content, null, 2)}\n`
      );
    },

    exists: () => exists(editor.config.path),

    extension: extensionCommand
      ? (extensionId: string) => {
          // extensionCommand is a full command line, e.g.
          // "code --install-extension" — split it so spawn gets a real binary
          const [command, ...commandArgs] = extensionCommand.split(" ");
          return spawnSync(command, [...commandArgs, extensionId], {
            stdio: "pipe",
          });
        }
      : undefined,

    update: async () => {
      ensureDirectory(editor.config.path);
      const doesExist = exists(editor.config.path);

      if (!doesExist) {
        await writeProjectFile(
          editor.config.path,
          `${JSON.stringify(content, null, 2)}\n`
        );
        return;
      }

      const existingContents = await readFile(editor.config.path, "utf-8");
      // jsonc-parser's output is untyped; a JSONC settings document parses to
      // an object at its root, or undefined when unparseable.
      const existingConfig: JsonObject | undefined = parse(existingContents);

      // An unparseable settings file must not be replaced wholesale — that
      // would destroy whatever the user had in it.
      if (existingConfig === undefined) {
        log.warn(
          `Could not parse ${editor.config.path}; fix its syntax and re-run \`ultracite init\` to add the Ultracite settings.`
        );
        return;
      }

      const newConfig = deepmerge(existingConfig, content);

      await writeProjectFile(
        editor.config.path,
        `${JSON.stringify(newConfig, null, 2)}\n`
      );
    },
  };
};
