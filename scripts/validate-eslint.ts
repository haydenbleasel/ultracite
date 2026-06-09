import { access, readdir } from "node:fs/promises";
import path from "node:path";

import { $ } from "bun";

const configDir = path.join(
  import.meta.dirname,
  "../packages/cli/config/eslint"
);

const validateEslintConfig = async (configPath: string): Promise<boolean> => {
  try {
    await access(configPath);

    const result =
      await $`node --check ${configPath} 2>&1 || echo "syntax_ok"`.quiet();
    const output = result.text();

    if (output.includes("SyntaxError")) {
      console.error(`  Syntax error in ${configPath}`);
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
        const configPath = path.join(configDir, framework, "eslint.config.mjs");
        const valid = await validateEslintConfig(configPath);
        return { framework, valid };
      })
  );

  for (const { framework, valid } of results) {
    console.log(`${valid ? "✓" : "✗"} eslint/${framework}`);
  }

  const failed = results.filter((r) => !r.valid);

  if (failed.length > 0) {
    console.error(`\n${failed.length} ESLint config(s) failed validation`);
    process.exit(1);
  }

  console.log(`\nAll ${results.length} ESLint configs valid`);
};

main();
