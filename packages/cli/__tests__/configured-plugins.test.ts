import { describe, expect, test } from "bun:test";
import path from "node:path";
import process from "node:process";

import {
  getConfiguredEslintFrameworks,
  getConfiguredPlugins,
} from "../src/configured-plugins";
import {
  eslintFrameworkDevDependencies,
  OXLINT_JS_PLUGIN_DEV_DEPENDENCIES,
} from "../src/dependencies";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

const withConfig = <T>(fileName: string, contents: string, run: () => T): T => {
  mockFileSystem({ [path.join(process.cwd(), fileName)]: contents });

  try {
    return run();
  } finally {
    restoreFileSystemMock();
  }
};

const eslintImports = (...presets: string[]): string =>
  presets
    .map((preset) => `import ${preset} from "ultracite/eslint/${preset}";`)
    .join("\n");

const configDir = path.join(import.meta.dir, "..", "config", "eslint");

// The package names a preset's own files import.
const presetImports = (preset: string): Set<string> => {
  const dir = path.join(configDir, preset);
  const rulesDir = path.join(dir, "rules");

  const sources = [
    path.join(dir, "eslint.config.mjs"),
    ...(globalThis.__realReaddirSync(dir).includes("rules")
      ? globalThis
          .__realReaddirSync(rulesDir)
          .map((file) => path.join(rulesDir, String(file)))
      : []),
  ];

  return new Set(
    sources.flatMap((source) =>
      [
        ...globalThis
          .__realReadFileSync(source, "utf-8")
          .matchAll(/from "(?<specifier>[^".][^"]*)"/gu),
      ].map((match) => match.groups?.specifier ?? "")
    )
  );
};

// Plugins a preset loads without importing them itself.
const loadedIndirectly = new Map([
  // eslint-plugin-astro loads it for the astro/jsx-a11y/* rules.
  ["astro", ["eslint-plugin-jsx-a11y"]],
]);

describe("getConfiguredEslintFrameworks", () => {
  test("reads the presets the ESLint config imports", () => {
    expect([
      ...withConfig(
        "eslint.config.mjs",
        `${eslintImports("core", "nestjs")}\n\nexport default [...core, ...nestjs];`,
        getConfiguredEslintFrameworks
      ),
    ]).toEqual(["core", "nestjs"]);
  });

  test("is empty without an ESLint config", () => {
    expect([...getConfiguredEslintFrameworks()]).toEqual([]);
  });
});

describe("getConfiguredPlugins", () => {
  test("lists the rule plugins of the ESLint presets the config imports", () => {
    const plugins = withConfig(
      "eslint.config.mjs",
      eslintImports("core", "react"),
      () => getConfiguredPlugins("eslint")
    );

    expect(plugins.get("eslint-plugin-react-doctor")).toBe(
      eslintFrameworkDevDependencies.react["eslint-plugin-react-doctor"]
    );
    expect(plugins.has("eslint-plugin-unicorn")).toBe(true);
    expect(plugins.has("@typescript-eslint/eslint-plugin")).toBe(true);

    // Parsers, shared configs, globals and formatters aren't rule plugins.
    for (const name of [
      "@eslint/js",
      "@typescript-eslint/parser",
      "eslint",
      "eslint-config-prettier",
      "globals",
      "prettier",
    ]) {
      expect(plugins.has(name)).toBe(false);
    }

    // Presets the config doesn't import contribute nothing.
    expect(plugins.has("eslint-plugin-vue")).toBe(false);
  });

  test("checks the Angular template parser alongside its plugin", () => {
    const plugins = withConfig(
      "eslint.config.mjs",
      eslintImports("core", "angular"),
      () => getConfiguredPlugins("eslint")
    );

    expect(plugins.get("@angular-eslint/eslint-plugin-template")).toBe(
      eslintFrameworkDevDependencies.angular[
        "@angular-eslint/eslint-plugin-template"
      ]
    );
    expect(plugins.get("@angular-eslint/template-parser")).toBe(
      eslintFrameworkDevDependencies.angular["@angular-eslint/template-parser"]
    );
  });

  test("lists the JS plugins the Oxlint config loads", () => {
    const plugins = withConfig(
      "oxlint.config.ts",
      [
        'import core from "ultracite/oxlint/core";',
        'import { selectJsPlugins } from "ultracite/oxlint/js-plugins";',
        'const jsPlugins = selectJsPlugins(["react-doctor"]);',
      ].join("\n"),
      () => getConfiguredPlugins("oxlint")
    );

    expect([...plugins]).toEqual([
      [
        "oxlint-plugin-react-doctor",
        OXLINT_JS_PLUGIN_DEV_DEPENDENCIES["oxlint-plugin-react-doctor"],
      ],
    ]);
  });

  test("has nothing to check for Biome", () => {
    expect(getConfiguredPlugins("biome").size).toBe(0);
  });

  // Doctor fails a configured plugin that's missing, so it must only check
  // plugins the preset really loads.
  test.each(["core", ...Object.keys(eslintFrameworkDevDependencies)])(
    "only lists plugins the %s preset loads",
    (preset) => {
      const plugins = withConfig(
        "eslint.config.mjs",
        eslintImports(preset),
        () => getConfiguredPlugins("eslint")
      );

      const loaded = new Set([
        ...presetImports(preset),
        ...(loadedIndirectly.get(preset) ?? []),
      ]);

      expect(plugins.size).toBeGreaterThan(0);
      expect([...plugins.keys()].filter((name) => !loaded.has(name))).toEqual(
        []
      );
    }
  );
});
