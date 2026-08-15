/**
 * Generates declaration files (.d.mts) for oxlint and oxfmt config exports,
 * and syncs biome/core's files.includes from the shared ignore patterns.
 * Run as part of the build to keep types and configs in sync.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { applyEdits, modify } from "jsonc-parser";

const configDir = path.join(import.meta.dirname, "../config");

const oxlintDeclaration = `import type { OxlintConfig } from "oxlint";

declare const config: OxlintConfig;

export default config;
`;

// js-plugins additionally exports the selectJsPlugins helper that generated
// configs use to enable a subset of the plugins.
const oxlintJsPluginsDeclaration = `${oxlintDeclaration}
export type OxlintJsPluginName = "github" | "sonarjs" | "react-doctor";

/**
 * Returns a copy of the js-plugins preset narrowed to the given plugin
 * names: only the selected jsPlugins entries are loaded and only their
 * rules (top-level and per-override) are kept.
 */
export declare const selectJsPlugins: (
  pluginNames: readonly OxlintJsPluginName[]
) => OxlintConfig;
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

for (const config of configs) {
  const dir = path.join(oxlintDir, config);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "index.d.mts"),
    config === "js-plugins" ? oxlintJsPluginsDeclaration : oxlintDeclaration
  );
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
