import { readFile } from "node:fs/promises";

import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { runScriptCommand } from "nypm";
import type { PackageManagerName } from "nypm";

import { hooks } from "./data/hooks";
import type { options } from "./data/options";
import type { JsonObject, JsonValue } from "./data/types";
import {
  assertSupportedPackageManagerName,
  supportedPackageManagers,
} from "./package-manager";
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

// The same JSON with every string in `from` replaced by `to`.
const replaceStrings = (
  value: JsonValue,
  from: ReadonlySet<JsonValue>,
  to: string
): JsonValue => {
  if (from.has(value)) {
    return to;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceStrings(item, from, to));
  }

  if (isJsonObject(value)) {
    return mapValues(value, (item) => replaceStrings(item, from, to));
  }

  return value;
};

const biomeHookArgs = ["--skip=correctness/noUnusedImports"];

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

// Every hook command an earlier `init` may have generated: each package
// manager, with and without the Biome skip, with and without `--hook`.
const generatedFixCommands = (): Set<string> =>
  new Set(
    supportedPackageManagers.flatMap((packageManager) =>
      [[], biomeHookArgs].flatMap((linterArgs) => [
        createFixCommand(packageManager, linterArgs),
        createFixCommand(packageManager, [...linterArgs, "--hook"]),
      ])
    )
  );

export const createHooks = (
  name: (typeof options.hooks)[number],
  packageManager: PackageManagerName,
  linter = "biome"
) => {
  const hookIntegration = hooks.find((hook) => hook.id === name);

  if (!hookIntegration) {
    throw new Error(`Hook integration "${name}" not found`);
  }

  const linterArgs = linter === "biome" ? biomeHookArgs : [];

  const command = createFixCommand(packageManager, [...linterArgs, "--hook"]);
  // A re-run rewrites a command from an earlier `init` in place, so an
  // existing install picks up the single-file hook, and a changed package
  // manager or linter, instead of keeping the old command or gaining a
  // second hook.
  const outdatedCommands = generatedFixCommands();
  outdatedCommands.delete(command);
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
      replaceStrings(value, outdatedCommands, command)
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
