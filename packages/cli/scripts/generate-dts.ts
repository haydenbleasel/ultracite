/**
 * Generates declaration files (.d.mts) for oxlint and oxfmt config exports,
 * and generates ignores.jsonc from the shared ignore patterns for biome.
 * Run as part of the build to keep types and configs in sync.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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

// Generate ignores.jsonc from the shared ignore patterns (for biome extends)
const { ignorePatterns } = await import("../config/shared/ignores.mjs");
const biomeIncludes = ["**", ...ignorePatterns.map((p: string) => `!!${p}`)];
const includesJson = JSON.stringify(biomeIncludes, null, 2)
  .split("\n")
  .map((line, i) => (i === 0 ? line : `    ${line}`))
  .join("\n");

const ignoresJsonc = `{
  // Auto-generated from ignores.mjs — do not edit directly.
  // This file exists so biome can extend it via "extends".
  "files": {
    "includes": ${includesJson}
  }
}
`;
writeFileSync(join(configDir, "shared/ignores.jsonc"), ignoresJsonc);

console.log(
  `Generated declaration files for ${String(configs.length)} oxlint configs and oxfmt, and ignores.jsonc`
);
