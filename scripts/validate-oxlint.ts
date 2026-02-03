import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const configDir = join(import.meta.dirname, "../packages/cli/config/oxlint");

const stripJsonComments = (content: string): string => {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/,(\s*[}\]])/g, "$1");
};

const validateOxlintConfig = async (configPath: string): Promise<boolean> => {
  try {
    const content = await readFile(configPath, "utf-8");
    const cleanJson = stripJsonComments(content);
    const config = JSON.parse(cleanJson);

    if (typeof config !== "object" || config === null) {
      return false;
    }

    if (!config.$schema?.includes("oxlint")) {
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
  const results: { framework: string; valid: boolean }[] = [];

  for (const framework of frameworks) {
    if (framework.startsWith(".")) {
      continue;
    }

    const configPath = join(configDir, framework, ".oxlintrc.json");
    const valid = await validateOxlintConfig(configPath);

    results.push({ framework, valid });
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
