import { readFile } from "node:fs/promises";

import { log } from "@clack/prompts";
import { applyEdits, modify } from "jsonc-parser";
import { z } from "zod";

import { editors } from "./data/editors";
import type { ProviderId } from "./data/providers";
import type { JsonObject, JsonValue } from "./data/types";
import { detectJsonFormatting, parseJsoncStrict } from "./schemas";
import { spawnSync } from "./spawn-sync";
import type { SpawnSyncResult } from "./spawn-sync";
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

// What an editor with no launcher on PATH reports, so the caller asks the user
// to install the extension by hand, as it does for a failed install.
const NO_LAUNCHER: SpawnSyncResult = {
  errorCode: "ENOENT",
  status: null,
};

// A launcher that isn't the editor's own (Kiro's `kiro` can be set to open
// Kiro CLI instead of the IDE) must not hang init; a timed-out install counts
// as failed, and init asks the user to install the extension.
const EXTENSION_INSTALL_TIMEOUT_MS = 120_000;

/**
 * Install an extension with the editor's own launcher, never VS Code's `code`:
 * that would put it in VS Code, not the editor the user picked. Launchers are
 * tried in order until one is on PATH.
 */
const installExtension = (
  clis: readonly string[],
  extensionId: string
): SpawnSyncResult => {
  for (const cli of clis) {
    const result = spawnSync(cli, ["--install-extension", extensionId], {
      stdio: "pipe",
      timeout: EXTENSION_INSTALL_TIMEOUT_MS,
    });

    if (result.errorCode !== "ENOENT") {
      return result;
    }
  }

  return NO_LAUNCHER;
};

export const createEditorConfig = (
  editorId: string,
  linter: ProviderId = "biome"
) => {
  const editor = editors.find((e) => e.id === editorId);

  if (!editor) {
    throw new Error(`Editor "${editorId}" not found`);
  }

  const content = editor.config.getContent(linter);
  const { extensionClis } = editor.config;

  return {
    create: async () => {
      await writeProjectFile(
        editor.config.path,
        `${JSON.stringify(content, null, 2)}\n`
      );
    },

    exists: () => exists(editor.config.path),

    extension: extensionClis
      ? (extensionId: string) => installExtension(extensionClis, extensionId)
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
