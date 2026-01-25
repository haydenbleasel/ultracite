import { join } from "node:path";
import { $ } from "bun";

const scriptsDir = import.meta.dirname;

const main = async () => {
  console.log("Validating Biome configs...\n");
  const biome = await $`bun ${join(scriptsDir, "validate-biome.ts")}`.nothrow();

  console.log("\nValidating ESLint configs...\n");
  const eslint =
    await $`bun ${join(scriptsDir, "validate-eslint.ts")}`.nothrow();

  console.log("\nValidating Oxlint configs...\n");
  const oxlint =
    await $`bun ${join(scriptsDir, "validate-oxlint.ts")}`.nothrow();

  const failed = [biome, eslint, oxlint].filter((r) => r.exitCode !== 0);

  if (failed.length > 0) {
    process.exit(1);
  }

  console.log("\n✓ All configs valid");
};

main();
