import { readFile } from "node:fs/promises";

import { log } from "@clack/prompts";
import { applyEdits, modify } from "jsonc-parser";
import { z } from "zod";

import { editors } from "./data/editors";
import type { ProviderId } from "./data/providers";
import type { JsonObject, JsonValue } from "./data/types";
import { detectJsonFormatting, parseJsoncStrict } from "./schemas";
import { spawnSync } from "./spawn-sync";
import { exists, isJsonObject, writeProjectFile } from "./utils";

const settingsSchema = z.record(z.string(), z.json());

// The leaf settings `content` sets, as JSON paths, descending into objects the
// existing settings already have so their other keys (and comments) survive.
const collectSettings = (
  existing: JsonValue | undefined,
  content: JsonObject,
  parentPath: string[] = []
): [string[], JsonValue][] =>
  Object.entries(content).flatMap(([key, value]) => {
    const current = isJsonObject(existing) ? existing[key] : undefined;

    return isJsonObject(value) && isJsonObject(current)
      ? collectSettings(current, value, [...parentPath, key])
      : [[[...parentPath, key], value] satisfies [string[], JsonValue]];
  });

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
      const doesExist = exists(editor.config.path);

      if (!doesExist) {
        await writeProjectFile(
          editor.config.path,
          `${JSON.stringify(content, null, 2)}\n`
        );
        return;
      }

      const existingContents = await readFile(editor.config.path, "utf-8");
      const existingConfig = parseJsoncStrict(existingContents, settingsSchema);

      // A settings file with a syntax error must not be rewritten: the parser
      // only recovers part of it, and writing that back would drop the rest.
      if (existingConfig === undefined) {
        log.warn(
          `Could not parse ${editor.config.path}; fix its syntax and re-run \`ultracite init\` to add the Ultracite settings.`
        );
        return;
      }

      // Edit the document setting by setting so the user's comments and
      // formatting survive.
      const formattingOptions = detectJsonFormatting(existingContents);
      let contents = existingContents;
      for (const [settingPath, value] of collectSettings(
        existingConfig,
        content
      )) {
        contents = applyEdits(
          contents,
          modify(contents, settingPath, value, { formattingOptions })
        );
      }

      await writeProjectFile(editor.config.path, contents);
    },
  };
};
