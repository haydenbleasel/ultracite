/**
 * Generates declaration files (.d.mts) for oxlint and oxfmt config exports.
 * Run as part of the build to keep types in sync with config directories.
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

console.log(
  `Generated declaration files for ${String(configs.length)} oxlint configs and oxfmt`
);
