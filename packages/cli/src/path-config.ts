import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { findWorkspaces } from "find-workspaces";
import { createJiti } from "jiti";
import { z } from "zod";

import { UltraciteSetupError } from "./config-resolution";
import { frameworks } from "./data/options";

const overrideSchema = z.strictObject({
  extends: z.array(z.string()),
  files: z.union([z.string(), z.array(z.string()).min(1)]),
});

const configSchema = z.strictObject({
  extends: z.array(z.string()).optional(),
  overrides: z.array(overrideSchema).optional(),
});

export type UltraciteConfig = z.infer<typeof configSchema>;

export interface PresetScope {
  directory: string;
  excludedDirectories?: string[];
  files: string[];
  presets: string[];
}

export interface ResolvedPathConfig {
  configFiles: string[];
  projectRoot: string;
  scopes: PresetScope[];
}

const configFileName = "ultracite.config.ts";
const supportedPresets = new Set([
  "core",
  ...frameworks,
  "anti-slop",
  "js-plugins",
  "next/js-plugins",
  "shadcn",
  "tanstack/js-plugins",
  "type-aware",
]);
const toPosix = (value: string): string => value.split(path.sep).join("/");

const globFragment = (glob: string): string => {
  let pattern = "";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "{") {
      let depth = 1;
      let end = index + 1;
      for (; end < glob.length && depth > 0; end += 1) {
        if (glob[end] === "{") {
          depth += 1;
        } else if (glob[end] === "}") {
          depth -= 1;
        }
      }
      if (depth !== 0) {
        throw new UltraciteSetupError(
          `Invalid Ultracite config glob "${glob}".`
        );
      }
      const alternatives: string[] = [];
      let alternativeStart = index + 1;
      let nestedDepth = 0;
      for (let cursor = index + 1; cursor < end - 1; cursor += 1) {
        if (glob[cursor] === "{") {
          nestedDepth += 1;
        } else if (glob[cursor] === "}") {
          nestedDepth -= 1;
        } else if (glob[cursor] === "," && nestedDepth === 0) {
          alternatives.push(glob.slice(alternativeStart, cursor));
          alternativeStart = cursor + 1;
        }
      }
      alternatives.push(glob.slice(alternativeStart, end - 1));
      if (alternatives.length < 2 || alternatives.some((item) => !item)) {
        throw new UltraciteSetupError(
          `Invalid Ultracite config glob "${glob}". Brace groups must contain comma-separated alternatives.`
        );
      }
      pattern += `(?:${alternatives.map(globFragment).join("|")})`;
      index = end - 1;
    } else if (char === "}") {
      throw new UltraciteSetupError(`Invalid Ultracite config glob "${glob}".`);
    } else if (char === "*" && glob[index + 1] === "*") {
      index += 1;
      if (glob[index + 1] === "/") {
        index += 1;
        pattern += "(?:.*/)?";
      } else {
        pattern += ".*";
      }
    } else if (char === "*") {
      pattern += "[^/]*";
    } else if (char === "?") {
      pattern += "[^/]";
    } else if (char === "[") {
      const end = glob.indexOf("]", index + 1);
      if (end === -1) {
        throw new UltraciteSetupError(
          `Invalid Ultracite config glob "${glob}".`
        );
      }
      const contents = glob.slice(index + 1, end);
      const negated = contents.startsWith("!");
      const characterClass = negated ? contents.slice(1) : contents;
      if (!characterClass) {
        throw new UltraciteSetupError(
          `Invalid Ultracite config glob "${glob}".`
        );
      }
      pattern += `(?:(?!/)[${negated ? "^" : ""}${characterClass}])`;
      index = end;
    } else {
      pattern += char.replaceAll(/[|\\()[\]{}^$+?.]/gu, "\\$&");
    }
  }
  return pattern;
};

const globToRegExp = (glob: string): RegExp => {
  if (
    !glob ||
    path.isAbsolute(glob) ||
    path.win32.isAbsolute(glob) ||
    glob.split(/[\\/]/u).includes("..")
  ) {
    throw new UltraciteSetupError(
      `Invalid Ultracite config glob "${glob}". Use a non-empty project-relative pattern without "..".`
    );
  }
  try {
    return new RegExp(`^${globFragment(glob)}$`, "u");
  } catch (error) {
    throw new UltraciteSetupError(
      `Invalid Ultracite config glob "${glob}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const validateGlob = (glob: string): void => {
  globToRegExp(glob);
};

/** Find path configs only at the project root and declared workspace roots. */
export const findPathConfigFiles = (root: string): string[] => {
  const projectRoot = path.resolve(root);
  const workspaceLocations = (findWorkspaces(projectRoot) ?? [])
    .map(({ location }) => path.resolve(location))
    .filter((location) => {
      const relative = path.relative(projectRoot, location);
      return (
        relative === "" ||
        (!relative.startsWith(`..${path.sep}`) && relative !== "..")
      );
    });
  const candidates = new Set([projectRoot, ...workspaceLocations]);
  const found: string[] = [];
  for (const directory of candidates) {
    let entries;
    try {
      entries = readdirSync(directory);
    } catch {
      continue;
    }
    if (entries.includes(configFileName)) {
      found.push(path.join(directory, configFileName));
    }
  }
  return found.toSorted((left, right) => left.localeCompare(right));
};

const loadConfig = async (configPath: string): Promise<UltraciteConfig> => {
  let module: { default?: unknown };
  try {
    module = await createJiti(pathToFileURL(configPath).href).import(
      configPath
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new UltraciteSetupError(
      `Could not load ${configPath}: ${detail}. Ensure it is a valid TypeScript config.`
    );
  }

  const parsed = configSchema.safeParse(module.default);
  if (!parsed.success) {
    throw new UltraciteSetupError(
      `Invalid ${configPath}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`
    );
  }
  return parsed.data;
};

const isWithin = (parent: string, child: string): boolean => {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== "..")
  );
};

/** Resolve path-based presets with deterministic parent-before-child ordering. */
export const resolvePathConfig = async (
  projectRoot: string,
  configs?: string[]
): Promise<ResolvedPathConfig | null> => {
  const root = path.resolve(projectRoot);
  const found = (configs ?? findPathConfigFiles(root))
    .map((file) => path.resolve(file))
    .toSorted(
      (left, right) =>
        path.relative(root, path.dirname(left)).split(path.sep).length -
          path.relative(root, path.dirname(right)).split(path.sep).length ||
        left.localeCompare(right)
    );
  if (found.length === 0) {
    return null;
  }
  for (const file of found) {
    if (!isWithin(root, file)) {
      throw new UltraciteSetupError(
        `Ultracite config ${file} is outside project root ${root}.`
      );
    }
  }

  const configPaths = new Set(found);
  const cache = new Map<string, UltraciteConfig>();
  const resolvedScopes = new Map<string, PresetScope[]>();
  const scopes: PresetScope[] = [];
  const active: string[] = [];
  const resolveFile = async (file: string): Promise<PresetScope[]> => {
    if (active.includes(file)) {
      const cycle = [...active.slice(active.indexOf(file)), file]
        .map((entry) => path.relative(root, entry))
        .join(" -> ");
      throw new UltraciteSetupError(
        `Circular Ultracite config inheritance: ${cycle}`
      );
    }
    const cachedScopes = resolvedScopes.get(file);
    if (cachedScopes) {
      return cachedScopes;
    }
    active.push(file);
    let config = cache.get(file);
    if (!config) {
      config = await loadConfig(file);
      cache.set(file, config);
    }
    const directory = path.dirname(file);
    const inheritedScopes: PresetScope[] = [];
    for (const parent of config.extends ?? []) {
      if (parent.startsWith("ultracite/")) {
        const preset = parent.slice("ultracite/".length);
        if (!supportedPresets.has(preset)) {
          throw new UltraciteSetupError(
            `Unknown Ultracite preset "${parent}".`
          );
        }
        inheritedScopes.push({
          directory,
          files: ["**/*"],
          presets: [preset],
        });
        continue;
      }
      if (!parent.startsWith(".")) {
        throw new UltraciteSetupError(
          `Unsupported Ultracite config extension "${parent}" in ${file}. Use a relative config path or an "ultracite/<preset>" preset.`
        );
      }
      const parentPath = path.resolve(directory, parent);
      if (!isWithin(root, parentPath) || !configPaths.has(parentPath)) {
        throw new UltraciteSetupError(
          `Ultracite config extension "${parent}" in ${file} must resolve to a discovered config inside ${root}.`
        );
      }
      // Parent configs must be resolved before child scopes for stable merging.
      // oxlint-disable-next-line no-await-in-loop
      const parentScopes = await resolveFile(parentPath);
      for (const parentScope of parentScopes) {
        const relativeScopeDirectory = toPosix(
          path.relative(parentScope.directory, directory)
        );
        const files = parentScope.files.flatMap((glob) => {
          if (glob === "**/*" || relativeScopeDirectory === "") {
            return [glob];
          }
          const prefix = `${relativeScopeDirectory}/`;
          if (glob.startsWith(prefix)) {
            return [glob.slice(prefix.length)];
          }
          return [];
        });
        if (files.length > 0) {
          inheritedScopes.push({
            directory,
            files,
            presets: parentScope.presets,
          });
        }
      }
    }
    for (const override of config.overrides ?? []) {
      const files = Array.isArray(override.files)
        ? override.files
        : [override.files];
      for (const glob of files) {
        validateGlob(glob);
      }
      for (const preset of override.extends) {
        if (!preset.startsWith("ultracite/")) {
          throw new UltraciteSetupError(
            `Override presets must use "ultracite/<preset>"; received "${preset}" in ${file}.`
          );
        }
        const name = preset.slice("ultracite/".length);
        if (!supportedPresets.has(name)) {
          throw new UltraciteSetupError(
            `Unknown Ultracite preset "${preset}".`
          );
        }
        inheritedScopes.push({ directory, files, presets: [name] });
      }
    }
    active.pop();
    resolvedScopes.set(file, inheritedScopes);
    return inheritedScopes;
  };

  for (const file of found) {
    const configDirectory = path.dirname(file);
    const childConfigDirectories = found
      .map((entry) => path.dirname(entry))
      .filter((directory) => {
        const relative = path.relative(configDirectory, directory);
        return (
          relative !== "" &&
          relative !== ".." &&
          !relative.startsWith(`..${path.sep}`) &&
          !path.isAbsolute(relative)
        );
      });
    // Preserve ancestor-first ordering when scopes from multiple configs merge.
    // oxlint-disable-next-line no-await-in-loop
    const configScopes = await resolveFile(file);
    scopes.push(
      ...configScopes.map((scope) => ({
        ...scope,
        excludedDirectories: childConfigDirectories,
      }))
    );
  }
  return { configFiles: found, projectRoot: root, scopes };
};

/** Return whether a project-relative path is matched by a resolved scope. */
export const matchesPresetScope = (
  file: string,
  scope: PresetScope
): boolean => {
  const absoluteFile = path.resolve(file);
  const relative = toPosix(path.relative(scope.directory, absoluteFile));
  if (
    relative.startsWith("../") ||
    relative === ".." ||
    path.isAbsolute(relative)
  ) {
    return false;
  }
  if (
    scope.excludedDirectories?.some((directory) => {
      const excludedRelative = toPosix(path.relative(directory, absoluteFile));
      return (
        excludedRelative === "" ||
        (!excludedRelative.startsWith("../") && excludedRelative !== "..")
      );
    })
  ) {
    return false;
  }
  return scope.files.some((pattern) => globToRegExp(pattern).test(relative));
};
