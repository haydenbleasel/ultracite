import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

import { bunRules } from "./rules.mjs";

// `bun lint` and `bun fmt` read oxlint.config.ts and oxfmt.config.ts, so the
// Bun provider uses Ultracite's Oxlint and Oxfmt presets as they are. This
// module is what its generated configs import `defineConfig` from, instead
// of `oxlint` or `oxfmt`: Bun runs without either package installed, and the
// import marks the project as a Bun one for `ultracite check`.
//
//   import { defineConfig } from "ultracite/bun";
//   import core from "ultracite/oxlint/core";
//
//   export default defineConfig({
//     env: core.env,
//     extends: [core],
//     ignorePatterns: core.ignorePatterns,
//   });

const supportedRules = new Set(bunRules);

// oxlint built-in plugins Bun has no rules for. Enabling one of their rules
// makes `bun lint` exit 2.
const unsupportedPlugins = new Set(["jsdoc", "vue"]);

// The prefixes of Bun's built-in rules under every name it accepts
// (`typescript`, `@typescript-eslint`, `@next/next`, ...), plus the plugins
// above. A rule under any other prefix belongs to a JS plugin (anti-slop,
// sonarjs, ...), which Bun loads and runs itself.
const builtinPrefixes = [
  ...new Set([
    ...bunRules.flatMap((name) =>
      name.includes("/") ? [name.slice(0, name.lastIndexOf("/"))] : []
    ),
    ...unsupportedPlugins,
  ]),
];

const isBuiltinRule = (name) =>
  !name.includes("/") ||
  builtinPrefixes.some((prefix) => name.startsWith(`${prefix}/`));

const isSupportedRule = (name) =>
  supportedRules.has(name) || !isBuiltinRule(name);

const isConfigObject = (entry) => entry === Object(entry);

// A copy of a preset (or an override inside one) without the built-in rules
// and plugins Bun doesn't implement.
const forBun = (config) => {
  const copy = { ...config };

  if (copy.rules) {
    copy.rules = Object.fromEntries(
      Object.entries(copy.rules).filter(([name]) => isSupportedRule(name))
    );
  }

  if (Array.isArray(copy.plugins)) {
    copy.plugins = copy.plugins.filter(
      (plugin) => !unsupportedPlugins.has(plugin)
    );
  }

  if (Array.isArray(copy.overrides)) {
    copy.overrides = copy.overrides.map(forBun);
  }

  if (Array.isArray(copy.extends)) {
    copy.extends = copy.extends.map((entry) =>
      isConfigObject(entry) ? forBun(entry) : entry
    );
  }

  return copy;
};

// `bun fmt` takes Tailwind's class order from the `tailwindcss` package, and
// leaves a file with classes to sort unformatted (exiting 2) when the file
// can't resolve one, where Oxfmt falls back to its own copy of the order.
// Bun runs from the project root, so that's where to look.
const hasTailwindcss = () => {
  const require = createRequire(path.join(process.cwd(), "package.json"));

  return ["tailwindcss", "tailwindcss/package.json"].some((specifier) => {
    try {
      require.resolve(specifier);

      return true;
    } catch {
      return false;
    }
  });
};

/**
 * Returns the config with Bun's gaps removed. For a lint config, rules from
 * oxlint's built-in plugins that `bun lint` doesn't implement (such as
 * `jsdoc/*` and `vue/*`) are dropped from every extended preset, so a run
 * doesn't fail on them; the config's own rules are left as written. For a
 * format config, Tailwind class sorting is turned off when the project has
 * no `tailwindcss` installed, so `bun fmt` formats the files it can't sort.
 */
export const defineConfig = (config) => {
  if (config.sortTailwindcss && !hasTailwindcss()) {
    return Object.fromEntries(
      Object.entries(config).filter(([key]) => key !== "sortTailwindcss")
    );
  }

  if (!Array.isArray(config.extends)) {
    return config;
  }

  return {
    ...config,
    extends: config.extends.map((entry) =>
      isConfigObject(entry) ? forBun(entry) : entry
    ),
  };
};
