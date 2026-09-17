import { readFile } from "node:fs/promises";

import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { runScriptCommand } from "nypm";
import type { PackageManagerName } from "nypm";

import { hooks } from "./data/hooks";
import type { options } from "./data/options";
import type { JsonObject, JsonValue } from "./data/types";
import { assertSupportedPackageManagerName } from "./package-manager";
import { ensureDirectory, exists, writeProjectFile } from "./utils";

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mapValues = (
  obj: JsonObject,
  map: (value: JsonValue) => JsonValue
): JsonObject =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, map(value)])
  );

// The same JSON with every string equal to `from` replaced by `to`.
const replaceString = (
  value: JsonValue,
  from: string,
  to: string
): JsonValue => {
  if (value === from) {
    return to;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceString(item, from, to));
  }

  if (isJsonObject(value)) {
    return mapValues(value, (item) => replaceString(item, from, to));
  }

  return value;
};

const createFixCommand = (
  packageManager: PackageManagerName,
  args: string[] = []
): string => {
  const safePackageManager = assertSupportedPackageManagerName(packageManager);
  // npm swallows flags after `npm run <script>` unless they come after `--`
  const scriptArgs =
    safePackageManager === "npm" && args.length > 0 ? ["--", ...args] : args;
  return runScriptCommand(safePackageManager, "fix", { args: scriptArgs });
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

  const linterArgs =
    linter === "biome" ? ["--skip=correctness/noUnusedImports"] : [];

  const command = createFixCommand(packageManager, [...linterArgs, "--hook"]);
  // The command from before `--hook` existed. A re-run upgrades it in place,
  // so an existing install picks up the single-file hook.
  const commandWithoutHook = createFixCommand(packageManager, linterArgs);
  const content = hookIntegration.hooks.getContent(command);

  const hasUltraciteHook = (obj: JsonObject): boolean => {
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
    // jsonc-parser's output is untyped; a JSONC document parses to a JSON
    // value, or undefined when unparseable.
    const parsed: JsonValue | undefined = parse(existingContent);
    const existingJson: JsonObject = isJsonObject(parsed) ? parsed : {};

    const upgraded = mapValues(existingJson, (value) =>
      replaceString(value, commandWithoutHook, command)
    );

    if (JSON.stringify(upgraded) !== JSON.stringify(existingJson)) {
      await writeProjectFile(
        hookIntegration.hooks.path,
        `${JSON.stringify(upgraded, null, 2)}\n`
      );
      return;
    }

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
