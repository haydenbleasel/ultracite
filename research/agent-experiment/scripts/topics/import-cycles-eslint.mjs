// ESLint for the import-cycles topic, in its own process: eslint-plugin-import-x keeps resolver
// and module caches for the life of a process (corpus report §4.5: linting one project first
// changes another's no-cycle count), so every lint of a subject directory starts fresh.
//
// Usage: node import-cycles-eslint.mjs <dir> <honor|ignore|fix> [file ...]
//   Lints the given .ts files (default: every .ts file under <dir>) with Ultracite's ESLint core
//   preset, unchanged, from <dir>; `ignore` sets noInlineConfig, `fix` writes `eslint --fix`'s
//   output to the files first. Prints one JSON array of
//   { file, rule, line, column, message, fix, fatal }, as `eslint -f json` would carry them.
import { readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const CLI = join(REPO, "packages/cli");
const require = createRequire(join(CLI, "package.json"));
const { ESLint } = require("eslint");

const [dir, mode, ...given] = process.argv.slice(2);
const walk = (d, out = []) => {
  for (const name of readdirSync(d).sort()) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) {
      if (name !== "node_modules") walk(p, out);
    } else if (/\.ts$/.test(name) && !name.endsWith(".d.ts")) out.push(p);
  }
  return out;
};
const files = given.length ? given.map((f) => resolve(dir, f)) : walk(dir);
const preset = (
  await import(
    pathToFileURL(join(CLI, "config/eslint/core/eslint.config.mjs")).href
  )
).default;
const eslint = new ESLint({
  cwd: dir,
  fix: mode === "fix",
  ignore: false,
  overrideConfigFile: true,
  overrideConfig: [
    ...preset,
    {
      linterOptions: {
        noInlineConfig: mode === "ignore",
        reportUnusedDisableDirectives: "off",
      },
    },
  ],
});
const out = [];
const results = await eslint.lintFiles(files);
if (mode === "fix") await ESLint.outputFixes(results);
for (const r of results) {
  for (const m of r.messages) {
    out.push({
      file: relative(dir, r.filePath).split(sep).join("/"),
      rule:
        m.ruleId ??
        (m.fatal
          ? `parse: ${m.message}`
          : /eslint-disable/.test(m.message)
            ? "eslint/unused-disable-directive"
            : `eslint: ${m.message}`),
      line: m.line ?? null,
      column: m.column ?? null,
      message: m.message,
      fix: Boolean(m.fix),
      fatal: Boolean(m.fatal),
      severity: m.severity,
    });
  }
}
process.stdout.write(JSON.stringify(out));
