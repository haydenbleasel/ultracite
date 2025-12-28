import { readFile, writeFile } from "node:fs/promises";
import { editors } from "@repo/data/editors";
import type { options } from "@repo/data/options";
import deepmerge from "deepmerge";
import { dlxCommand, type PackageManagerName } from "nypm";
import { ensureDirectory, exists } from "./utils";

export const createHooks = (
  name: (typeof options.hooks)[number],
  packageManager: PackageManagerName
) => {
  const editor = editors.find((editor) => editor.id === name);

  if (!editor) {
    throw new Error(`Editor "${name}" not found`);
  }

  if (!editor.hooks) {
    throw new Error(`Editor "${name}" does not support hooks`);
  }

  const command = dlxCommand(packageManager, "ultracite", {
    args: ["fix"],
    short: packageManager === "npm",
  });
  const content = editor.hooks.getContent(command);

  const hasUltraciteHook = (obj: Record<string, unknown>): boolean => {
    return JSON.stringify(obj).includes("ultracite");
  };

  const updateConfig = async (): Promise<void> => {
    if (!editor.hooks?.path) {
      throw new Error(`Editor "${name}" does not support hooks`);
    }

    const doesExist = await exists(editor.hooks.path);

    if (!doesExist) {
      await writeFile(editor.hooks.path, JSON.stringify(content, null, 2));
      return;
    }

    const existingContent = await readFile(editor.hooks.path, "utf-8");
    const existingJson = JSON.parse(existingContent);

    if (!hasUltraciteHook(existingJson)) {
      const merged = deepmerge(existingJson, content);
      await writeFile(editor.hooks.path, JSON.stringify(merged, null, 2));
    }
  };

  return {
    exists: () => (editor.hooks?.path ? exists(editor.hooks.path) : false),
    create: async () => {
      if (!editor.hooks?.path) {
        throw new Error(`Editor "${name}" does not support hooks`);
      }

      await ensureDirectory(editor.hooks.path);
      await writeFile(editor.hooks.path, JSON.stringify(content, null, 2));
    },
    update: async () => {
      if (!editor.hooks?.path) {
        throw new Error(`Editor "${name}" does not support hooks`);
      }

      await ensureDirectory(editor.hooks.path);
      await updateConfig();
    },
  };
};
