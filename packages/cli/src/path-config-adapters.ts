import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import deepmerge from "deepmerge";
import fastGlob from "fast-glob";
import { createJiti } from "jiti";
import { parse } from "jsonc-parser";

import { ignorePatterns } from "../config/shared/ignores.mjs";
import { resolveFrom, UltraciteSetupError } from "./config-resolution";
import type { PresetScope, ResolvedPathConfig } from "./path-config";
import type { Linter } from "./utils";
import {
  biomeConfigNames,
  eslintConfigNames,
  findNearestFile,
  oxlintConfigNames,
  writeProjectFile,
} from "./utils";

// oxlint-disable anti-slop/no-unsafe-dictionary-type -- Provider rules and setting maps are versioned native configuration payloads, so preserving arbitrary JSON keys is required for complete translation.
// oxlint-disable anti-slop/no-runtime-typeof -- JSONC and ESM preset payloads require structural guards at the provider boundary.
// oxlint-disable anti-slop/require-safety-comment-for-type-assertion -- Assertions follow those provider boundary guards and do not escape the adapter.

const generatedDirectory = "node_modules/.cache/ultracite";
const packageConfigRoot = fileURLToPath(new URL("../config", import.meta.url));

const providerPresetPath = (linter: Linter, preset: string): string => {
  let presetFile: string;
  if (linter === "biome") {
    presetFile = `${preset}/biome.jsonc`;
  } else if (linter === "eslint") {
    presetFile = `${preset}/eslint.config.mjs`;
  } else {
    presetFile = `${preset}/index.mjs`;
  }
  const localPath = path.join(packageConfigRoot, linter, presetFile);
  if (existsSync(localPath)) {
    return localPath;
  }
  const resolvedPath = resolveFrom(
    `ultracite/${linter}/${preset}`,
    process.cwd()
  );
  if (!resolvedPath) {
    throw new UltraciteSetupError(
      `The preset "ultracite/${linter}/${preset}" is unavailable for the selected linter (${linter}).`
    );
  }
  return resolvedPath;
};

const existingNativeConfig = (linter: Linter): string | null => {
  const configNames = {
    biome: biomeConfigNames,
    eslint: eslintConfigNames,
    oxlint: oxlintConfigNames,
  } satisfies Record<Linter, readonly string[]>;
  return findNearestFile(configNames[linter])?.path ?? null;
};

const scopeGlobs = (scope: PresetScope, root: string): string[] => {
  const prefix = path.relative(root, scope.directory).split(path.sep).join("/");
  return [
    ...scope.files.map((file) => [prefix, file].filter(Boolean).join("/")),
    ...(scope.excludedDirectories ?? []).map(
      (directory) =>
        `!${path.relative(root, directory).split(path.sep).join("/")}/**/*`
    ),
  ];
};

const isWithinDirectory = (directory: string, target: string): boolean => {
  const relative = path.relative(directory, target);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
};

const scopeFiles = (scope: PresetScope, root: string): string[] => {
  const files = fastGlob.sync(scope.files, {
    cwd: scope.directory,
    ignore: ignorePatterns,
    onlyFiles: true,
  });
  const prefix = path.relative(root, scope.directory).split(path.sep).join("/");
  return files
    .map((file) => path.resolve(scope.directory, file))
    .filter(
      (file) =>
        !scope.excludedDirectories?.some((directory) =>
          isWithinDirectory(directory, file)
        )
    )
    .map((file) =>
      [prefix, path.relative(scope.directory, file).split(path.sep).join("/")]
        .filter(Boolean)
        .join("/")
    );
};

const matchesPresetFiles = (
  files: string[],
  presetPatterns: string[] | undefined,
  scope: PresetScope
): string[] => {
  if (!presetPatterns || presetPatterns.length === 0) {
    return files;
  }
  const matching = new Set(
    fastGlob.sync(presetPatterns, {
      cwd: scope.directory,
      ignore: ignorePatterns,
      onlyFiles: true,
    })
  );
  const prefix = path
    .relative(process.cwd(), scope.directory)
    .split(path.sep)
    .join("/");
  return files.filter((file) => {
    const local = prefix ? file.slice(prefix.length + 1) : file;
    return matching.has(local);
  });
};

const biomeConfigPath = `${generatedDirectory}/biome.json`;

const createBiomeConfig = async (
  resolved: ResolvedPathConfig
): Promise<string> => {
  const overrides: Record<string, unknown>[] = [];
  const hasRootCore = resolved.scopes.some(
    (scope) =>
      scope.directory === resolved.projectRoot &&
      scope.presets.includes("core") &&
      scope.files.includes("**/*")
  );
  for (const scope of resolved.scopes) {
    const files = scopeFiles(scope, resolved.projectRoot);
    if (files.length === 0) {
      continue;
    }
    for (const preset of scope.presets) {
      if (preset === "core" && hasRootCore) {
        continue;
      }
      const configPath = providerPresetPath("biome", preset);
      // Preserve preset order because each translated layer merges after its parent.
      // oxlint-disable-next-line no-await-in-loop
      const source = parse(await readFile(configPath, "utf-8")) as Record<
        string,
        unknown
      >;
      const nestedOverrides = Array.isArray(source.overrides)
        ? source.overrides
        : [];
      const baseConfig = Object.fromEntries(
        Object.entries(source).filter(
          ([key]) => !["$schema", "extends", "root", "overrides"].includes(key)
        )
      );
      overrides.push({ includes: files, ...baseConfig });
      for (const nested of nestedOverrides) {
        if (!nested || typeof nested !== "object") {
          continue;
        }
        const override = nested as Record<string, unknown>;
        const patterns = Array.isArray(override.includes)
          ? override.includes.filter(
              (item): item is string => typeof item === "string"
            )
          : undefined;
        const included = matchesPresetFiles(files, patterns, scope);
        if (included.length > 0) {
          overrides.push({
            ...Object.fromEntries(
              Object.entries(override).filter(([key]) => key !== "includes")
            ),
            includes: included,
          });
        }
      }
    }
  }
  const nativeConfig = existingNativeConfig("biome");
  const generated = {
    $schema: "../../@biomejs/biome/configuration_schema.json",
    extends: [
      ...(nativeConfig ? [nativeConfig] : []),
      ...(hasRootCore ? [providerPresetPath("biome", "core")] : []),
    ],
    overrides,
  };
  await writeProjectFile(
    biomeConfigPath,
    `${JSON.stringify(generated, null, 2)}\n`
  );
  return biomeConfigPath;
};

const eslintConfigPath = `${generatedDirectory}/eslint.config.mjs`;

const createEslintConfig = async (
  resolved: ResolvedPathConfig
): Promise<string> => {
  const imports = new Map<string, string>();
  const nativeConfig = existingNativeConfig("eslint");
  const configs: string[] = nativeConfig
    ? ["...(Array.isArray(nativeConfig) ? nativeConfig : [nativeConfig])"]
    : [];
  for (const scope of resolved.scopes) {
    for (const preset of scope.presets) {
      const existingIdentifier = imports.get(preset);
      if (existingIdentifier) {
        configs.push(
          `...scopeConfig(${existingIdentifier}, ${JSON.stringify(scopeGlobs(scope, resolved.projectRoot))})`
        );
      } else {
        const identifier = `preset${imports.size}`;
        imports.set(preset, identifier);
        configs.push(
          `...scopeConfig(${identifier}, ${JSON.stringify(scopeGlobs(scope, resolved.projectRoot))})`
        );
      }
    }
  }
  const importLines = [...imports]
    .map(
      ([preset, identifier]) =>
        `import ${identifier} from ${JSON.stringify(pathToFileURL(providerPresetPath("eslint", preset)).href)};`
    )
    .join("\n");
  const nativeImport = nativeConfig
    ? `import nativeConfig from ${JSON.stringify(pathToFileURL(nativeConfig).href)};\n`
    : "";
  const body = `${nativeImport}${importLines}\n\nconst scopeConfig = (config, scopes) => config.flatMap((entry) => {\n  if (Object.keys(entry).every((key) => key === "ignores")) return [entry];\n  const patterns = entry.files ?? ["**/*"];\n  const includedScopes = scopes.filter((scope) => !scope.startsWith("!"));\n  const excludedScopes = scopes.filter((scope) => scope.startsWith("!")).map((scope) => scope.slice(1));\n  return [{ ...entry, files: [...includedScopes.flatMap((scope) => patterns.map((pattern) => [scope, pattern])), ...excludedScopes.map((scope) => "!" + scope)] }];\n});\n\nexport default [${configs.join(",\n")}];\n`;
  await writeProjectFile(eslintConfigPath, body);
  return eslintConfigPath;
};

const oxlintConfigPath = ".ultracite-oxlint.config.mjs";

export const supportsNativeNodeTypeScriptConfig = (
  version: string
): boolean => {
  const [major = 0, minor = 0] = version.split(".").map(Number);
  return (
    (major === 20 && minor >= 19) ||
    (major === 22 && minor >= 18) ||
    (major === 23 && minor >= 6) ||
    major > 23
  );
};

const nativeTypeScriptSupportedByRuntime = (): boolean =>
  Boolean(process.versions.bun || process.versions.deno) ||
  supportsNativeNodeTypeScriptConfig(process.versions.node);

export const assertPathConfigPresetsAvailable = (
  linter: Linter,
  resolved: ResolvedPathConfig
): void => {
  const presets = new Set(resolved.scopes.flatMap((scope) => scope.presets));
  for (const preset of presets) {
    providerPresetPath(linter, preset);
  }
};

const createOxlintConfig = async (
  resolved: ResolvedPathConfig
): Promise<string> => {
  const overlays: Record<string, unknown>[] = [];
  const plugins = new Set<string>();
  const scopedRulesOff: Record<string, string> = {};
  const hasRootCore = resolved.scopes.some(
    (scope) =>
      scope.directory === resolved.projectRoot &&
      scope.presets.includes("core") &&
      scope.files.includes("**/*")
  );
  const jsPlugins = new Map<string, unknown>();
  const coreRuleNames = new Set<string>();
  if (hasRootCore) {
    const coreModule = await import(
      pathToFileURL(providerPresetPath("oxlint", "core")).href
    );
    const coreConfig = coreModule.default as Record<string, unknown>;
    if (coreConfig.rules && typeof coreConfig.rules === "object") {
      for (const rule of Object.keys(coreConfig.rules)) {
        coreRuleNames.add(rule);
      }
    }
  }
  let settings: Record<string, unknown> = {};
  for (const scope of resolved.scopes) {
    const files = scopeFiles(scope, resolved.projectRoot);
    for (const preset of scope.presets) {
      if (preset === "core" && hasRootCore) {
        continue;
      }
      // Presets are loaded sequentially to retain ancestor-before-child merge order.
      // oxlint-disable-next-line no-await-in-loop
      const presetModule = await import(
        pathToFileURL(providerPresetPath("oxlint", preset)).href
      );
      const config = presetModule.default as Record<string, unknown>;
      for (const plugin of Array.isArray(config.plugins)
        ? config.plugins
        : []) {
        if (typeof plugin === "string") {
          plugins.add(plugin);
        }
      }
      if (config.rules && typeof config.rules === "object") {
        for (const rule of Object.keys(config.rules)) {
          scopedRulesOff[rule] = "off";
        }
      }
      for (const plugin of Array.isArray(config.jsPlugins)
        ? config.jsPlugins
        : []) {
        if (plugin && typeof plugin === "object" && "name" in plugin) {
          jsPlugins.set(String(plugin.name), plugin);
        }
      }
      if (config.settings && typeof config.settings === "object") {
        settings = deepmerge(
          settings,
          config.settings as Record<string, unknown>
        );
      }
      if (
        config.rules &&
        Object.keys(config.rules).length > 0 &&
        files.length > 0
      ) {
        const overlay = {
          env: config.env,
          files,
          globals: config.globals,
          plugins: config.plugins,
          rules: config.rules,
        };
        overlays.push(overlay);
      }
      for (const override of Array.isArray(config.overrides)
        ? config.overrides
        : []) {
        if (!override || typeof override !== "object") {
          continue;
        }
        const entry = override as Record<string, unknown>;
        const patterns = Array.isArray(entry.files)
          ? entry.files.filter(
              (item): item is string => typeof item === "string"
            )
          : [];
        const matching = new Set(
          patterns.length > 0
            ? fastGlob.sync(patterns, {
                cwd: scope.directory,
                ignore: ignorePatterns,
                onlyFiles: true,
              })
            : []
        );
        const prefix = path
          .relative(resolved.projectRoot, scope.directory)
          .split(path.sep)
          .join("/");
        const scopedFiles = scopeFiles(scope, resolved.projectRoot).filter(
          (file) => matching.has(prefix ? file.slice(prefix.length + 1) : file)
        );
        if (scopedFiles.length > 0) {
          overlays.push({ ...entry, files: scopedFiles });
        }
      }
    }
  }
  const nativeConfig = existingNativeConfig("oxlint");
  let nativeConfigObject: Record<string, unknown> | undefined;
  let nativeConfigImport = "";
  if (nativeConfig) {
    if ([".json", ".jsonc"].includes(path.extname(nativeConfig))) {
      nativeConfigObject = parse(
        await readFile(nativeConfig, "utf-8")
      ) as Record<string, unknown>;
    } else {
      if (
        path.extname(nativeConfig) === ".ts" &&
        !nativeTypeScriptSupportedByRuntime()
      ) {
        throw new UltraciteSetupError(
          `The native Oxlint TypeScript config at ${nativeConfig} requires Node.js >=20.19.0 or >=22.18.0 (or Bun/Deno) because Oxlint loads the generated config natively.`
        );
      }
      nativeConfigImport = `import nativeConfig from ${JSON.stringify(pathToFileURL(nativeConfig).href)};\n`;
      const nativeModule = await createJiti(
        pathToFileURL(nativeConfig).href
      ).import<{ default?: unknown }>(nativeConfig);
      if (!nativeModule.default || typeof nativeModule.default !== "object") {
        throw new UltraciteSetupError(
          `The Oxlint config at ${nativeConfig} must export a configuration object.`
        );
      }
      nativeConfigObject = nativeModule.default as Record<string, unknown>;
    }
  }
  const nativeRules =
    nativeConfigObject?.rules && typeof nativeConfigObject.rules === "object"
      ? (nativeConfigObject.rules as Record<string, unknown>)
      : {};
  const nativeRuleNames = new Set(Object.keys(nativeRules));
  const effectiveRulesOff = Object.fromEntries(
    Object.entries(scopedRulesOff).filter(
      ([rule]) => !nativeRuleNames.has(rule) && !coreRuleNames.has(rule)
    )
  );
  if (Object.keys(effectiveRulesOff).length > 0) {
    overlays.unshift({
      files: [
        path.resolve(resolved.projectRoot, "**/*").split(path.sep).join("/"),
      ],
      rules: effectiveRulesOff,
    });
  }
  const nativePlugins = Array.isArray(nativeConfigObject?.plugins)
    ? nativeConfigObject.plugins.filter(
        (plugin): plugin is string => typeof plugin === "string"
      )
    : [];
  const nativeJsPlugins = Array.isArray(nativeConfigObject?.jsPlugins)
    ? nativeConfigObject.jsPlugins
    : [];
  for (const plugin of nativeJsPlugins) {
    if (plugin && typeof plugin === "object" && "name" in plugin) {
      jsPlugins.set(String(plugin.name), plugin);
    }
  }
  for (const plugin of nativePlugins) {
    plugins.add(plugin);
  }
  if (
    nativeConfigObject?.settings &&
    typeof nativeConfigObject.settings === "object"
  ) {
    settings = deepmerge(
      settings,
      nativeConfigObject.settings as Record<string, unknown>
    );
  }
  const nativeOverrides = Array.isArray(nativeConfigObject?.overrides)
    ? nativeConfigObject.overrides
    : [];
  const extensions = [
    ...(hasRootCore ? ["core"] : []),
    ...(nativeConfigObject
      ? [
          nativeConfigImport
            ? "nativeConfig"
            : JSON.stringify(nativeConfigObject),
        ]
      : []),
  ];
  const ignorePatternsFromNative = Array.isArray(
    nativeConfigObject?.ignorePatterns
  )
    ? nativeConfigObject.ignorePatterns.filter(
        (pattern): pattern is string => typeof pattern === "string"
      )
    : [];
  const body = `${nativeConfigImport}import { defineConfig } from "oxlint";\nimport core from ${JSON.stringify(pathToFileURL(providerPresetPath("oxlint", "core")).href)};\n\nexport default defineConfig({\n  extends: [${extensions.join(", ")}],\n  ignorePatterns: [...core.ignorePatterns, ...${JSON.stringify(ignorePatternsFromNative)}],\n  plugins: ${JSON.stringify([...plugins])},\n  jsPlugins: ${JSON.stringify([...jsPlugins.values()])},\n  rules: ${JSON.stringify(nativeRules)},\n  settings: ${JSON.stringify(settings)},\n  overrides: [...${JSON.stringify(overlays)}, ...${JSON.stringify(nativeOverrides)}],\n});\n`;
  await writeProjectFile(oxlintConfigPath, body);
  return oxlintConfigPath;
};

/** Materialize a provider-native config from the shared path-scoped config. */
export const materializePathConfig = (
  linter: Linter,
  resolved: ResolvedPathConfig
): Promise<string> => {
  if (linter === "biome") {
    return createBiomeConfig(resolved);
  }
  if (linter === "eslint") {
    return createEslintConfig(resolved);
  }
  return createOxlintConfig(resolved);
};
