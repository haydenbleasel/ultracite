import path from "node:path";

import { $ } from "bun";

const scriptsDir = import.meta.dirname;

const main = async () => {
  console.log("Validating Biome configs...\n");
  const biome =
    await $`bun ${path.join(scriptsDir, "validate-biome.ts")}`.nothrow();

  console.log("\nValidating ESLint configs...\n");
  const eslint =
    await $`bun ${path.join(scriptsDir, "validate-eslint.ts")}`.nothrow();

  console.log("\nValidating Oxlint configs...\n");
  const oxlint =
    await $`bun ${path.join(scriptsDir, "validate-oxlint.ts")}`.nothrow();

  console.log("\nChecking ESLint/oxlint rule parity...\n");
  const parityScript = path.join(
    scriptsDir,
    "../packages/cli/scripts/compare-rule-parity.ts"
  );
  const parity = await $`bun ${parityScript}`
    .cwd(path.join(scriptsDir, "../packages/cli"))
    .nothrow();

  const failed = [biome, eslint, oxlint, parity].filter(
    (r) => r.exitCode !== 0
  );

  if (failed.length > 0) {
    process.exit(1);
  }

  console.log("\n✓ All configs valid");
};

main();
