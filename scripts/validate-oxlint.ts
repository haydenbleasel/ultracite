import { readdir } from "node:fs/promises";
import path from "node:path";

const configDir = path.join(
  import.meta.dirname,
  "../packages/cli/config/oxlint"
);

const validateOxlintConfig = async (configPath: string): Promise<boolean> => {
  try {
    const mod = await import(configPath);

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
  const frameworks = await readdir(configDir);

  const results = await Promise.all(
    frameworks
      .filter((framework) => !framework.startsWith("."))
      .map(async (framework) => {
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
