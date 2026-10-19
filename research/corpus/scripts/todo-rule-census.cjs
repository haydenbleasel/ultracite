// Runs rule-census.cjs for the TODO-comments topic: Ultracite's core, react and js-plugins Oxlint
// presets, unchanged, over the eight corpus repos and Ultracite's CLI, focused on the rules that
// read task markers (no-warning-comments from core, sonarjs/todo-tag and fixme-tag from
// js-plugins) and no-inline-comments, which fires on a trailing marker comment too. Both modes.
//
// The React codebases (repos-accessibility.json) are left out of the census, so its pooled numbers
// cover the same eight repos as every earlier topic; todo-linters.cjs --corpus covers them.
//
// Usage (from the repo root):
//   node research/corpus/scripts/todo-rule-census.cjs [--repos zod,hono] [--modes reported,raw]
"use strict";

const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
const passThrough = ["repos", "modes"].flatMap((name) =>
  arg(name) ? [`--${name}`, arg(name)] : []
);

const env = { ...process.env };
delete env.CORPUS_REPO_LISTS;

execFileSync(
  process.execPath,
  [
    join(__dirname, "rule-census.cjs"),
    "--topic",
    "todo-comments",
    "--presets",
    "core,react,js-plugins",
    "--focus",
    "no-warning-comments,sonarjs/todo-tag,sonarjs/fixme-tag,no-inline-comments",
    ...passThrough,
  ],
  { env, stdio: "inherit" }
);
