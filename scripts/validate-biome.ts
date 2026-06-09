import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const configDir = path.join(
  import.meta.dirname,
  "../packages/cli/config/biome"
);

const stripJsonComments = (content: string): string =>
  content
    .replaceAll(/\/\*[\s\S]*?\*\//gu, "")
    .replaceAll(/\/\/.*$/gmu, "")
    .replaceAll(/,(?<trailing>\s*[}\]])/gu, "$<trailing>");

const validateBiomeConfig = async (configPath: string): Promise<boolean> => {
  try {
    const content = await readFile(configPath, "utf-8");
    const cleanJson = stripJsonComments(content);
    const config = JSON.parse(cleanJson);

    if (typeof config !== "object" || config === null) {
      return false;
    }

    if (!config.$schema?.includes("biome")) {
      console.error("  Missing or invalid $schema");
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
        const configPath = path.join(configDir, framework, "biome.jsonc");
        const valid = await validateBiomeConfig(configPath);
        return { framework, valid };
      })
  );

  for (const { framework, valid } of results) {
    console.log(`${valid ? "✓" : "✗"} biome/${framework}`);
  }

  const failed = results.filter((r) => !r.valid);

  if (failed.length > 0) {
    console.error(`\n${failed.length} Biome config(s) failed validation`);
    process.exit(1);
  }

  console.log(`\nAll ${results.length} Biome configs valid`);
};

main();
