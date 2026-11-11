import { readFileSync } from "node:fs";

import {
  eslintCoreDevDependencies,
  eslintFrameworkDevDependencies,
  OXLINT_JS_PLUGIN_DEV_DEPENDENCIES,
} from "./dependencies";
import { findLoadedJsPlugins } from "./linters/oxlint";
import { eslintConfigNames, findNearestFile, oxlintConfigNames } from "./utils";
import type { Linter } from "./utils";

/**
 * Which lint plugins a project's config loads. `ultracite doctor` checks the
 * installed version of each one and `ultracite upgrade` reinstalls them, so
 * whatever doctor flags, upgrade can fix.
 */

const readNearestConfig = (names: readonly string[]): string | null => {
  const found = findNearestFile(names);

  if (!found) {
    return null;
  }

  try {
    return readFileSync(found.path, "utf-8");
  } catch {
    return null;
  }
};

const ESLINT_PRESET_RE = /ultracite\/eslint\/(?<preset>[a-z-]+)/gu;

/**
 * The Ultracite presets the project's ESLint config imports: core,
 * type-aware and the framework presets. Their plugins are reinstalled even
 * when package.json lacks them, so a preset that gained a plugin in a newer
 * release (e.g. nestjs) gets it on upgrade.
 */
export const getConfiguredEslintFrameworks = (): Set<string> =>
  new Set(
    [
      ...(readNearestConfig(eslintConfigNames) ?? "").matchAll(
        ESLINT_PRESET_RE
      ),
    ].map((match) => match.groups?.preset ?? "")
  );

/** The npm JS plugins the project's Oxlint config loads. */
export const getConfiguredOxlintJsPlugins = (): Set<
  keyof typeof OXLINT_JS_PLUGIN_DEV_DEPENDENCIES
> => {
  const contents = readNearestConfig(oxlintConfigNames);

  return new Set(contents ? findLoadedJsPlugins(contents) : []);
};

// eslint-plugin-*, @scope/eslint-plugin and @scope/eslint-plugin-*. The
// presets also load parsers, shared configs, globals and Prettier plugins,
// which don't define the rules the presets name.
const ESLINT_PLUGIN_RE = /(?:^|\/)eslint-plugin(?:-|$)/u;

/**
 * The rule plugins the project's config loads, each mapped to the range this
 * release installs it at. The presets name their rules, so a plugin older
 * than that range can be missing some, and the linter then refuses to load
 * the config.
 */
export const getConfiguredPlugins = (linter: Linter): Map<string, string> => {
  const plugins = new Map<string, string>();

  if (linter === "eslint") {
    const presets = getConfiguredEslintFrameworks();

    const dependencies = [
      ...(presets.has("core") ? [eslintCoreDevDependencies] : []),
      ...Object.entries(eslintFrameworkDevDependencies).flatMap(
        ([framework, frameworkDependencies]) =>
          presets.has(framework) ? [frameworkDependencies] : []
      ),
    ];

    for (const [name, range] of dependencies.flatMap((entries) =>
      Object.entries(entries)
    )) {
      if (ESLINT_PLUGIN_RE.test(name)) {
        plugins.set(name, range);
      }
    }
  }

  if (linter === "oxlint") {
    for (const name of getConfiguredOxlintJsPlugins()) {
      plugins.set(name, OXLINT_JS_PLUGIN_DEV_DEPENDENCIES[name]);
    }
  }

  return plugins;
};

/**
 * Plugins whose rules come from another package. The ESLint React Doctor
 * plugin wraps the Oxlint one and pins it to its own version, so the two only
 * differ when an override or resolution forces the inner package to another
 * release, and then the wrapper's version says nothing about its rules.
 */
export const pluginRuleSources = new Map([
  ["eslint-plugin-react-doctor", "oxlint-plugin-react-doctor"],
]);
