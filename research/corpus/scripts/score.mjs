// Scores every function in the given files with sonarjs/cognitive-complexity
// and ESLint's cyclomatic `complexity`, both at a limit of 0 so every function
// reports. Handy for checking a hand-written example before it goes in a post.
//
// Usage: node research/corpus/scripts/score.mjs <file.ts...>
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { load } = require("./tools.cjs");

const files = process.argv.slice(2).map((file) => path.resolve(file));
if (files.length === 0) {
  console.error("usage: node research/corpus/scripts/score.mjs <file.ts...>");
  process.exit(2);
}

const { ESLint, tsParser, sonarjs } = load();

const eslint = new ESLint({
  cwd: path.dirname(files[0]),
  ignore: false,
  overrideConfig: [
    {
      files: ["**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}"],
      languageOptions: {
        parser: tsParser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { sonarjs },
      rules: {
        complexity: ["error", { max: 0 }],
        "sonarjs/cognitive-complexity": ["error", 0],
      },
    },
  ],
  overrideConfigFile: true,
});

const results = await eslint.lintFiles(files);
for (const result of results) {
  console.log(`\n${path.relative(process.cwd(), result.filePath)}`);
  for (const message of result.messages) {
    console.log(
      `  ${message.line}:${message.column} ${message.ruleId} — ${message.message}`
    );
  }
}
