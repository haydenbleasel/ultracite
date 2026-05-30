import { readFile } from "node:fs/promises";

import { hooks } from "@repo/data/hooks";
import type { options } from "@repo/data/options";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { runScriptCommand } from "nypm";
import type { PackageManagerName } from "nypm";

import { assertSupportedPackageManagerName } from "./package-manager";
import { ensureDirectory, exists, writeProjectFile } from "./utils";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createFixCommand = (
  packageManager: PackageManagerName,
  args: string[] = []
): string => {
  const safePackageManager = assertSupportedPackageManagerName(packageManager);
  return runScriptCommand(safePackageManager, "fix", { args });
};

export const createHooks = (
  name: (typeof options.hooks)[number],
  packageManager: PackageManagerName,
  linter = "biome"
) => {
  const hookIntegration = hooks.find((hook) => hook.id === name);

  if (!hookIntegration) {
    throw new Error(`Hook integration "${name}" not found`);
  }

  const args = linter === "biome" ? ["--skip=correctness/noUnusedImports"] : [];

  const command = createFixCommand(packageManager, args);
  const content = hookIntegration.hooks.getContent(command);

  const hasUltraciteHook = (obj: unknown): boolean => {
    const json = JSON.stringify(obj);
    return json.includes("ultracite") || json.includes(command);
  };

  const updateConfig = async (): Promise<void> => {
    const doesExist = exists(hookIntegration.hooks.path);

    if (!doesExist) {
      await writeProjectFile(
        hookIntegration.hooks.path,
        `${JSON.stringify(content, null, 2)}\n`
      );
      return;
    }

    const existingContent = await readFile(hookIntegration.hooks.path, "utf-8");
    const parsed = parse(existingContent) as unknown;
    const existingJson = isRecord(parsed) ? parsed : {};

    if (!hasUltraciteHook(existingJson)) {
      const merged = deepmerge(existingJson, content);
      await writeProjectFile(
        hookIntegration.hooks.path,
        `${JSON.stringify(merged, null, 2)}\n`
      );
    }
  };

  return {
    create: async () => {
      ensureDirectory(hookIntegration.hooks.path);
      await writeProjectFile(
        hookIntegration.hooks.path,
        `${JSON.stringify(content, null, 2)}\n`
      );
    },
    exists: () => exists(hookIntegration.hooks.path),
    update: async () => {
      ensureDirectory(hookIntegration.hooks.path);
      await updateConfig();
    },
  };
};
