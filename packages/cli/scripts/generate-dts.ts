/**
 * Generates declaration files (.d.mts) for oxlint and oxfmt config exports,
 * and syncs biome/core's files.includes from the shared ignore patterns.
 * Run as part of the build to keep types and configs in sync.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { applyEdits, modify } from "jsonc-parser";

const configDir = join(import.meta.dirname, "../config");

const oxlintDeclaration = `import type { OxlintConfig } from "oxlint";

declare const config: OxlintConfig;

export default config;
`;

const oxfmtDeclaration = `import type { OxfmtConfig } from "oxfmt";

declare const config: OxfmtConfig;

export default config;
`;

// Generate oxlint declarations
const oxlintDir = join(configDir, "oxlint");
const configs = readdirSync(oxlintDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const config of configs) {
  const dir = join(oxlintDir, config);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.d.mts"), oxlintDeclaration);
}

// Generate oxfmt declaration
const oxfmtDir = join(configDir, "oxfmt");
mkdirSync(oxfmtDir, { recursive: true });
writeFileSync(join(oxfmtDir, "index.d.mts"), oxfmtDeclaration);

// Sync biome/core's files.includes from the shared ignore patterns. Inlined
// (rather than extended from a separate jsonc file) because Biome's extend
// merge doesn't carry files.includes through a transitive chain when the
// consumer defines its own — see issue #679.
const { ignorePatterns } = await import("../config/shared/ignores.mjs");
const biomeIncludes = ["**", ...ignorePatterns.map((p: string) => `!!${p}`)];
const biomeCorePath = join(configDir, "biome/core/biome.jsonc");
const biomeCoreSource = readFileSync(biomeCorePath, "utf-8");
const biomeCoreEdits = modify(
  biomeCoreSource,
  ["files", "includes"],
  biomeIncludes,
  { formattingOptions: { insertSpaces: true, tabSize: 2 } }
);
writeFileSync(biomeCorePath, applyEdits(biomeCoreSource, biomeCoreEdits));

console.log(
  `Generated declaration files for ${String(configs.length)} oxlint configs and oxfmt, and synced biome/core includes`
);
