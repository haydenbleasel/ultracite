import { readFile, rm } from "node:fs/promises";

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
import { exists, writeProjectFile } from "./utils";

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * `existing` with the hook command replaced by `command` wherever `template`
 * (the content this integration generates) places its command and `existing`
 * holds one of `outdated` there. Only that position is touched: a user's own
 * hook that happens to run the fix script elsewhere is left alone. Arrays in
 * the template hold one entry, which stands for any entry in `existing`.
 */
const upgradeCommand = (
  existing: JsonValue,
  template: JsonValue,
  outdated: ReadonlySet<JsonValue>,
  command: string
): JsonValue => {
  if (template === command) {
    return outdated.has(existing) ? command : existing;
  }

  if (Array.isArray(template) && Array.isArray(existing)) {
    const [entry] = template;
    return entry === undefined
      ? existing
      : existing.map((item) => upgradeCommand(item, entry, outdated, command));
  }

  if (isJsonObject(template) && isJsonObject(existing)) {
    return Object.fromEntries(
      Object.entries(existing).map(([key, value]) => [
        key,
        Object.hasOwn(template, key)
          ? upgradeCommand(value, template[key], outdated, command)
          : value,
      ])
    );
  }

  return existing;
};

/**
 * The strings `existing` holds wherever `template` places its command (see
 * upgradeCommand). Only hook commands count: a settings file that mentions
 * ultracite elsewhere, e.g. in a permission rule, has no ultracite hook.
 */
const commandsAt = (
  existing: JsonValue,
  template: JsonValue,
  command: string
): string[] => {
  if (template === command) {
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- decoding a user's hook settings, where the command position may hold any JSON value
    return typeof existing === "string" ? [existing] : [];
  }

  if (Array.isArray(template) && Array.isArray(existing)) {
    const [entry] = template;
    return entry === undefined
      ? []
      : existing.flatMap((item) => commandsAt(item, entry, command));
  }

  if (isJsonObject(template) && isJsonObject(existing)) {
    return Object.entries(existing).flatMap(([key, value]) =>
      Object.hasOwn(template, key)
        ? commandsAt(value, template[key], command)
        : []
    );
  }

  return [];
};

/**
 * `existing` without the entries of `template`'s arrays whose command is one
 * `isGenerated` accepts, and without keys that leaves empty. Used to retire a
 * hook written in a format this integration no longer generates.
 */
const removeGeneratedEntries = (
  existing: JsonValue,
  template: JsonValue,
  command: string,
  isGenerated: (value: string) => boolean
): JsonValue => {
  if (Array.isArray(template) && Array.isArray(existing)) {
    const [entry] = template;
    return entry === undefined
      ? existing
      : existing.filter(
          (item) => !commandsAt(item, entry, command).some(isGenerated)
        );
  }

  if (isJsonObject(template) && isJsonObject(existing)) {
    const entries: [string, JsonValue][] = [];

    for (const [key, value] of Object.entries(existing)) {
      if (!Object.hasOwn(template, key)) {
        entries.push([key, value]);
        continue;
      }

      const pruned = removeGeneratedEntries(
        value,
        template[key],
        command,
        isGenerated
      );
      const becameEmpty =
        JSON.stringify(pruned) !== JSON.stringify(value) &&
        (Array.isArray(pruned)
          ? pruned.length === 0
          : isJsonObject(pruned) && Object.keys(pruned).length === 0);

      if (!becameEmpty) {
        entries.push([key, pruned]);
      }
    }

    return Object.fromEntries(entries);
  }

  return existing;
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

// The script commands of ultracite 7.8.0 and earlier: `npm run fix -- ...`
// for npm and a bare `<pm> fix ...` for every other package manager.
const legacyFixCommand = (
  packageManager: PackageManagerName,
  args: string[]
): string =>
  packageManager === "npm"
    ? ["npm", "run", "fix", ...(args.length > 0 ? ["--", ...args] : [])].join(
        " "
      )
    : [packageManager, "fix", ...args].join(" ");

// Every hook command an earlier `init` may have generated: each package
// manager, with and without the Biome skip, with and without `--hook`, plus
// the bare `<pm> fix` scripts of 7.8.0 and earlier and the `npm run fix
// --skip=...` (flag swallowed by npm) of 7.8.1 and 7.8.2.
const generatedFixCommands = (): Set<string> =>
  new Set(
    supportedPackageManagers.flatMap((packageManager) =>
      [[], biomeHookArgs].flatMap((linterArgs) => [
        createFixCommand(packageManager, linterArgs),
        createFixCommand(packageManager, [...linterArgs, "--hook"]),
        legacyFixCommand(packageManager, linterArgs),
        runScriptCommand(packageManager, "fix", { args: linterArgs }),
      ])
    )
  );

const readJson = async (filePath: string): Promise<JsonObject> => {
  // jsonc-parser's output is untyped; a JSONC document parses to a JSON
  // value, or undefined when unparseable.
  const parsed: JsonValue | undefined = parse(
    await readFile(filePath, "utf-8")
  );
  return isJsonObject(parsed) ? parsed : {};
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

  const linterArgs = linter === "biome" ? biomeHookArgs : [];

  const command = createFixCommand(packageManager, [...linterArgs, "--hook"]);
  // A re-run rewrites a command from an earlier `init` in place, so an
  // existing install picks up the single-file hook, and a changed package
  // manager or linter, instead of keeping the old command or gaining a
  // second hook.
  const outdatedCommands = generatedFixCommands();
  outdatedCommands.delete(command);
  const content = hookIntegration.hooks.getContent(command);

  const isGeneratedCommand = (value: string): boolean =>
    value === command || outdatedCommands.has(value);

  const hasUltraciteHook = (obj: JsonObject): boolean =>
    commandsAt(obj, content, command).some(
      (hookCommand) =>
        isGeneratedCommand(hookCommand) || hookCommand.includes("ultracite")
    );

  // Drops hooks written in a format this integration no longer generates,
  // so the current one isn't added next to them and run twice.
  const retireLegacyFormat = (existing: JsonObject): JsonObject => {
    const { getLegacyContent } = hookIntegration.hooks;

    if (!getLegacyContent) {
      return existing;
    }

    const pruned = removeGeneratedEntries(
      existing,
      getLegacyContent(command),
      command,
      isGeneratedCommand
    );
    return isJsonObject(pruned) ? pruned : existing;
  };

  // Takes Ultracite's hook out of the file the host used to read, and removes
  // the file when that leaves it empty.
  const retireLegacyPath = async (): Promise<void> => {
    const { legacyPath } = hookIntegration.hooks;

    if (!(legacyPath && exists(legacyPath))) {
      return;
    }

    const legacy = await readJson(legacyPath);
    const pruned = removeGeneratedEntries(
      legacy,
      content,
      command,
      isGeneratedCommand
    );

    if (JSON.stringify(pruned) === JSON.stringify(legacy)) {
      return;
    }

    await (isJsonObject(pruned) && Object.keys(pruned).length === 0
      ? rm(legacyPath, { force: true })
      : writeProjectFile(legacyPath, `${JSON.stringify(pruned, null, 2)}\n`));
  };

  const updateConfig = async (): Promise<void> => {
    const { legacyPath, path } = hookIntegration.hooks;
    const doesExist = exists(path);
    // A new hooks file starts from the old one, so the user's own hooks keep
    // running once the host switches to it.
    const seedPath = doesExist ? path : legacyPath;

    if (!(seedPath && exists(seedPath))) {
      await writeProjectFile(path, `${JSON.stringify(content, null, 2)}\n`);
      await retireLegacyPath();
      return;
    }

    const existingJson = await readJson(seedPath);
    const current = retireLegacyFormat(existingJson);

    const upgraded = upgradeCommand(
      current,
      content,
      outdatedCommands,
      command
    );

    if (!isJsonObject(upgraded)) {
      return;
    }

    const next = hasUltraciteHook(upgraded)
      ? upgraded
      : deepmerge(upgraded, content);

    if (!doesExist || JSON.stringify(next) !== JSON.stringify(existingJson)) {
      await writeProjectFile(path, `${JSON.stringify(next, null, 2)}\n`);
    }
    await retireLegacyPath();
  };

  return {
    create: async () => {
      await updateConfig();
    },
    exists: () => exists(hookIntegration.hooks.path),
    update: async () => {
      await updateConfig();
    },
  };
};
