import { readdir } from "node:fs/promises";
import path from "node:path";

const configDir = path.join(
  import.meta.dirname,
  "../packages/cli/config/oxlint"
);

const validateOxlintConfig = async (configPath: string): Promise<boolean> => {
  try {
    const mod = await import(configPath);

    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- this is the I/O boundary decoding the untyped default export of a dynamically imported config module
    if (typeof mod.default !== "object" || mod.default === null) {
      console.error("  Missing or invalid default export");
      return false;
    }

    return true;
  } catch (error) {
    console.error(`  Error: ${error instanceof Error ? error.message : error}`);
    return false;
  }
};

const main = async () => {
  const entries = await readdir(configDir, {
    recursive: true,
    withFileTypes: true,
  });
  // Presets can nest one level deep (e.g. next/js-plugins); every preset
  // directory is identified by its index.mjs.
  const frameworks = entries
    .filter((entry) => entry.isFile() && entry.name === "index.mjs")
    .map((entry) => path.relative(configDir, entry.parentPath))
    .toSorted();

  const results = await Promise.all(
    frameworks.map(async (framework) => {
      const configPath = path.join(configDir, framework, "index.mjs");
      const valid = await validateOxlintConfig(configPath);
      return { framework, valid };
    })
  );

  for (const { framework, valid } of results) {
    console.log(`${valid ? "✓" : "✗"} oxlint/${framework}`);
  }

  const failed = results.filter((r) => !r.valid);

  if (failed.length > 0) {
    console.error(`\n${failed.length} Oxlint config(s) failed validation`);
    process.exit(1);
  }

  console.log(`\nAll ${results.length} Oxlint configs valid`);
};

main();
