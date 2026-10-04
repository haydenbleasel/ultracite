/**
 * Generates declaration files (.d.mts) for oxlint and oxfmt config exports,
 * and syncs biome/core's files.includes from the shared ignore patterns.
 * Run as part of the build to keep types and configs in sync.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { applyEdits, modify } from "jsonc-parser";
import type { OxlintConfig } from "oxlint";

const configDir = path.join(import.meta.dirname, "../config");

const renderOxlintDeclaration = (
  configType: string
) => `import type { OxlintConfig } from "oxlint";

declare const config: ${configType};

export default config;
`;

// Presets that always ship plugins (js-plugins, shadcn, anti-slop and the
// framework js-plugins add-ons) declare jsPlugins as non-null, so generated
// configs can spread several of them onto the root config (#834).
const oxlintConfigWithJsPluginsType = `OxlintConfig & {
  jsPlugins: NonNullable<OxlintConfig["jsPlugins"]>;
}`;

// js-plugins additionally exports the jsPluginSettings object and the
// selectJsPlugins helper that generated configs use to apply react-doctor's
// settings and enable a subset of the plugins.
const oxlintJsPluginsDeclaration = `${renderOxlintDeclaration("OxlintConfigWithJsPlugins")}
/** An Oxlint config whose \`jsPlugins\` is always set. */
export type OxlintConfigWithJsPlugins = ${oxlintConfigWithJsPluginsType};

export type OxlintJsPluginName =
  | "github"
  | "jsdoc-js"
  | "sonarjs"
  | "tsdoc"
  | "react-doctor";

/**
 * react-doctor settings (the "curated" ported-rule mode). Oxlint does not
 * merge \`settings\` from extended configs, so apply these on the root
 * config: \`settings: jsPluginSettings\`.
 */
export declare const jsPluginSettings: NonNullable<OxlintConfig["settings"]>;

/**
 * Returns a copy of the js-plugins preset narrowed to the given plugin
 * names: only the selected jsPlugins entries are loaded and only their
 * rules (top-level and per-override) are kept.
 */
export declare const selectJsPlugins: (
  pluginNames: readonly OxlintJsPluginName[]
) => OxlintConfigWithJsPlugins;
`;

const oxfmtDeclaration = `import type { OxfmtConfig } from "oxfmt";

declare const config: OxfmtConfig;

export default config;
`;

// Generate oxlint declarations. Presets can nest one level deep (e.g.
// next/js-plugins), so include subdirectories that hold an index.mjs.
const oxlintDir = path.join(configDir, "oxlint");
const configs = readdirSync(oxlintDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const nested = readdirSync(path.join(oxlintDir, entry.name), {
      withFileTypes: true,
    })
      .filter((child) => child.isDirectory())
      .map((child) => `${entry.name}/${child.name}`);
    return [entry.name, ...nested];
  });

const getOxlintDeclaration = async (config: string): Promise<string> => {
  if (config === "js-plugins") {
    return oxlintJsPluginsDeclaration;
  }
  const preset: { default: OxlintConfig } = await import(
    path.join(oxlintDir, config, "index.mjs")
  );
  return renderOxlintDeclaration(
    Array.isArray(preset.default.jsPlugins)
      ? oxlintConfigWithJsPluginsType
      : "OxlintConfig"
  );
};

const oxlintDeclarations = await Promise.all(configs.map(getOxlintDeclaration));

for (const [index, config] of configs.entries()) {
  const dir = path.join(oxlintDir, config);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "index.d.mts"), oxlintDeclarations[index]);
}

// Generate oxfmt declaration
const oxfmtDir = path.join(configDir, "oxfmt");
mkdirSync(oxfmtDir, { recursive: true });
writeFileSync(path.join(oxfmtDir, "index.d.mts"), oxfmtDeclaration);

// Sync biome/core's files.includes from the shared ignore patterns. Inlined
// (rather than extended from a separate jsonc file) because Biome's extend
// merge doesn't carry files.includes through a transitive chain when the
// consumer defines its own — see issue #679.
const { ignorePatterns } = await import("../config/shared/ignores.mjs");
const biomeIncludes = ["**", ...ignorePatterns.map((p: string) => `!!${p}`)];
const biomeCorePath = path.join(configDir, "biome/core/biome.jsonc");
const biomeCoreSource = readFileSync(biomeCorePath, "utf-8");
const biomeCoreEdits = modify(
  biomeCoreSource,
  ["files", "includes"],
  biomeIncludes,
  { formattingOptions: { insertSpaces: true, tabSize: 2 } }
);
writeFileSync(biomeCorePath, applyEdits(biomeCoreSource, biomeCoreEdits));

console.log(
  `Generated declaration files for ${String(configs.length)} oxlint presets, oxfmt, and synced biome/core includes`
);
