import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getEditorById } from "@ultracite/data/editors";
import type { options } from "@ultracite/data/options";
import deepmerge from "deepmerge";
import { dlxCommand, type PackageManagerName } from "nypm";
import { exists } from "../utils";

export const createHooks = (
  name: (typeof options.hooks)[number],
  packageManager: PackageManagerName
) => {
  const editor = getEditorById(name);
  if (!editor?.hooks) {
    throw new Error(`Editor "${name}" does not support hooks`);
  }

  const { path: configPath, getContent } = editor.hooks;
  const command = dlxCommand(packageManager, "ultracite", {
    args: ["fix"],
    short: packageManager === "npm",
  });
  const content = getContent(command);

  const ensureDirectory = async () => {
    const dir = dirname(configPath);
    if (dir !== ".") {
      const cleanDir = dir.startsWith("./") ? dir.slice(2) : dir;
      await mkdir(cleanDir, { recursive: true });
    }
  };

  const hasUltraciteHook = (obj: Record<string, unknown>): boolean => {
    return JSON.stringify(obj).includes("ultracite");
  };

  const updateConfig = async (): Promise<void> => {
    if (!(await exists(configPath))) {
      await writeFile(configPath, JSON.stringify(content, null, 2));
      return;
    }

    const existingContent = await readFile(configPath, "utf-8");
    const existingJson = JSON.parse(existingContent);

    if (!hasUltraciteHook(existingJson)) {
      const merged = deepmerge(existingJson, content);
      await writeFile(configPath, JSON.stringify(merged, null, 2));
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
      await updateConfig();
    },
  };
};
