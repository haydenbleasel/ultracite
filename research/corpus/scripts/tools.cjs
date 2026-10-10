// Resolves the exact tool installations used for the measurements, from this repo: ESLint,
// the TypeScript parser and Biome from packages/cli, eslint-plugin-sonarjs from the root.
// Nothing is installed; everything is loaded from the existing node_modules (read-only).
"use strict";

const { dirname, join, resolve } = require("node:path");

// research/corpus/scripts -> the repo root.
const ULTRACITE = resolve(__dirname, "../../..");
const CLI = join(ULTRACITE, "packages/cli");

const pkgDir = (name, base) =>
  dirname(require.resolve(`${name}/package.json`, { paths: [base] }));

const dirs = {
  eslint: pkgDir("eslint", CLI),
  tsParser: pkgDir("@typescript-eslint/parser", CLI),
  biome: pkgDir("@biomejs/biome", CLI),
  sonarjs: pkgDir("eslint-plugin-sonarjs", ULTRACITE),
};
// typescript as seen by the parser (the parser's own resolution)
dirs.typescript = pkgDir("typescript", dirs.tsParser);

const version = (dir) => require(join(dir, "package.json")).version;

// Package entry points, resolved through each package's "exports" from the same base dirs.
const entry = (name, base) => require.resolve(name, { paths: [base] });

function load() {
  const { ESLint } = require(entry("eslint", CLI));
  const tsParser = require(entry("@typescript-eslint/parser", CLI));
  const sonarjs = require(entry("eslint-plugin-sonarjs", ULTRACITE));
  // Internal helpers, loaded by absolute path (bypassing "exports") so the census rule can
  // compute exactly the same report locations the two real rules use.
  const astUtils = require(join(dirs.eslint, "lib/rules/utils/ast-utils.js"));
  const sonarLocation = require(join(dirs.sonarjs, "cjs/helpers/location.js"));
  return { ESLint, tsParser, sonarjs, astUtils, sonarLocation };
}

function versions() {
  return {
    node: process.version,
    eslint: version(dirs.eslint),
    "@typescript-eslint/parser": version(dirs.tsParser),
    typescript: version(dirs.typescript),
    "eslint-plugin-sonarjs": version(dirs.sonarjs),
    "@biomejs/biome": version(dirs.biome),
  };
}

const biomeBin = join(dirs.biome, "bin/biome");

// Results for one post live in results/<topic>/. RESEARCH_TOPIC picks the topic; the default
// is the first post's.
const TOPIC = process.env.RESEARCH_TOPIC ?? "cognitive-complexity";
const RESULTS_DIR = resolve(__dirname, "..", "results", TOPIC);

module.exports = {
  dirs,
  load,
  versions,
  biomeBin,
  ULTRACITE,
  TOPIC,
  RESULTS_DIR,
};

if (require.main === module) {
  console.log(JSON.stringify({ dirs, versions: versions() }, null, 2));
}
