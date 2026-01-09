import { hooks } from "@repo/data/hooks";
import type { options } from "@repo/data/options";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { readFile, writeFile } from "node:fs/promises";
import { dlxCommand, type PackageManagerName } from "nypm";

import { ensureDirectory, exists } from "./utils";

export const createHooks = (
  name: (typeof options.hooks)[number],
  packageManager: PackageManagerName
) => {
  const hookIntegration = hooks.find((hook) => hook.id === name);

  if (!hookIntegration) {
    throw new Error(`Hook integration "${name}" not found`);
  }

  const command = dlxCommand(packageManager, "ultracite", {
    args: ["fix"],
    short: packageManager === "npm",
  });
  const content = hookIntegration.hooks.getContent(command);

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const hasUltraciteHook = (obj: unknown): boolean =>
    JSON.stringify(obj).includes("ultracite");

  const updateConfig = async (): Promise<void> => {
    const doesExist = await exists(hookIntegration.hooks.path);

    if (!doesExist) {
      await writeFile(
        hookIntegration.hooks.path,
        JSON.stringify(content, null, 2)
      );
      return;
    }

    const existingContent = await readFile(hookIntegration.hooks.path, "utf8");
    const parsed = parse(existingContent) as unknown;
    const existingJson = isRecord(parsed) ? parsed : {};

    if (!hasUltraciteHook(existingJson)) {
      const merged = deepmerge(existingJson, content);
      await writeFile(
        hookIntegration.hooks.path,
        JSON.stringify(merged, null, 2)
      );
    }
  };

  return {
    create: async () => {
      await ensureDirectory(hookIntegration.hooks.path);
      await writeFile(
        hookIntegration.hooks.path,
        JSON.stringify(content, null, 2)
      );
    },
    exists: () => exists(hookIntegration.hooks.path),
    update: async () => {
      await ensureDirectory(hookIntegration.hooks.path);
      await updateConfig();
    },
  };
};
