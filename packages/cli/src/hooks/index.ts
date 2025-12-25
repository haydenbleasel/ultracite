import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getEditorById } from "@ultracite/data/editors";
import type { options } from "@ultracite/data/options";
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

  const { path: configPath, content: template } = editor.hooks;
  const command = dlxCommand(packageManager, "ultracite", {
    args: ["fix"],
    short: packageManager === "npm",
  });
  const content = template.replace("{{command}}", command);

  const ensureDirectory = async () => {
    const dir = dirname(configPath);
    if (dir !== ".") {
      const cleanDir = dir.startsWith("./") ? dir.slice(2) : dir;
      await mkdir(cleanDir, { recursive: true });
    }
  };

  const updateConfig = async (): Promise<void> => {
    if (!(await exists(configPath))) {
      await writeFile(configPath, content);
      return;
    }

    const existingContent = await readFile(configPath, "utf-8");
    const existingJson = JSON.parse(existingContent);

    // Check if ultracite hook already exists
    const hasUltraciteHook = existingJson.hooks?.afterFileEdit?.some(
      (hook: { command: string }) => hook.command.includes("ultracite")
    );

    if (!hasUltraciteHook) {
      if (!existingJson.hooks) {
        existingJson.hooks = {};
      }
      if (!existingJson.hooks.afterFileEdit) {
        existingJson.hooks.afterFileEdit = [];
      }
      existingJson.hooks.afterFileEdit.push({ command });
      await writeFile(configPath, JSON.stringify(existingJson, null, 2));
    }
  };

  return {
    exists: () => exists(configPath),
    create: async () => {
      await ensureDirectory();
      await writeFile(configPath, content);
    },
    update: async () => {
      await ensureDirectory();
      await updateConfig();
    },
  };
};
