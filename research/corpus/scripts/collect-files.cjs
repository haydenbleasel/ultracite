// Collects the source files to analyse for one repo, applying global and per-repo exclusions.
// Read-only: walks the directory tree and reads file headers; never executes repo code.
//
// CLI: node collect-files.cjs <repoName> [--flags]
//   prints the included file count by extension, exclusion counts by reason, and
//   (with --flags) files whose header looks generated/vendored for manual review.
"use strict";

const { readdirSync, readFileSync, statSync } = require("node:fs");
const { join, relative, resolve, sep } = require("node:path");

const ROOT = resolve(__dirname, "..");
// repos.json is the corpus. A topic that extends it for itself (the accessibility post adds React
// codebases in repos-accessibility.json) sets CORPUS_REPO_LISTS to a comma-separated list of extra
// files next to this script. They're appended, so repos.json and every earlier topic's file lists
// stay exactly the same, and with the variable unset nothing changes.
const EXTRA_LISTS = (process.env.CORPUS_REPO_LISTS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s && s !== "repos.json");
const config = {
  ...require("./repos.json"),
  repos: [
    ...require("./repos.json").repos,
    ...EXTRA_LISTS.flatMap((file) => require(`./${file}`).repos),
  ],
};

const SOURCE_EXT = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

// Directory names excluded anywhere in the tree.
const EXCLUDED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build-output",
  "__tests__",
  "__tests_dts__",
  "__test__",
  "__mocks__",
  "__fixtures__",
  "__snapshots__",
  "test",
  "tests",
  "fixtures",
  "fixture",
  "benchmarks",
  "bench",
  "examples",
  "example",
  "vendor",
  "vendored",
  "compiled",
  "bundles",
  "polyfills",
]);

// File-name patterns excluded anywhere.
const EXCLUDED_FILE_PATTERNS = [
  [/\.d\.[cm]?ts$/, "declaration file (*.d.ts)"],
  [/\.(?:test|spec)\.[cm]?[jt]sx?$/, "test file (*.test.* / *.spec.*)"],
  [/\.(?:bench|benchmark)\.[cm]?[jt]sx?$/, "benchmark file"],
  [/\.stories\.[cm]?[jt]sx?$/, "storybook story"],
  [/(?:^|[-_.])test-?utils?\.[cm]?[jt]sx?$/i, "test utility file"],
];

// Third-party license text in the first 40 lines => the file is (derived from) someone else's code.
// Excluded automatically unless the copyright belongs to the repo owner (repo.ownCopyright).
const LICENSE_RE =
  /(?:MIT License|The MIT License|Copyright \(c\)|@copyright|Permission is hereby granted|Licensed under the Apache)/i;

function thirdPartyLicense(repo, abs) {
  const head = readFileSync(abs, "utf8").split("\n").slice(0, 40).join("\n");
  if (!LICENSE_RE.test(head)) return false;
  if (repo.ownCopyright && new RegExp(repo.ownCopyright).test(head))
    return false;
  return true;
}

// Header heuristics, used only to FLAG files for manual review (not to exclude automatically).
const HEADER_FLAGS =
  /(?:@generated|auto-?generated|generated (?:by|with|file)|do not edit|emscripten|copied from|forked from|vendored|ported from|adapted from|taken from|based on https?:|eslint-disable\s*\*\/|@ts-nocheck)/i;

function getRepo(name) {
  const repo = config.repos.find((r) => r.name === name);
  if (!repo) {
    throw new Error(
      `Unknown repo "${name}". Known: ${config.repos.map((r) => r.name).join(", ")}`
    );
  }
  const root = repo.dir.startsWith("/") ? repo.dir : join(ROOT, repo.dir);
  return { ...repo, root };
}

function collect(name) {
  const repo = getRepo(name);
  const included = [];
  const excluded = new Map(); // reason -> count
  const excludedFiles = []; // [{file, reason}] for file-level (not directory-level) exclusions
  const excludedPaths = new Set(repo.exclude.map((p) => p.replace(/\/$/, "")));
  const bump = (reason, rel) => {
    excluded.set(reason, (excluded.get(reason) ?? 0) + 1);
    if (rel) excludedFiles.push({ file: rel, reason });
  };

  const isRepoExcluded = (rel) => {
    for (const p of excludedPaths) {
      if (rel === p || rel.startsWith(`${p}/`)) return true;
    }
    return false;
  };

  const countFiles = (dir) => {
    let n = 0;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) n += countFiles(join(dir, e.name));
      else if (SOURCE_EXT.test(e.name)) n++;
    }
    return n;
  };

  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      const rel = relative(repo.root, abs).split(sep).join("/");
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (EXCLUDED_DIR_NAMES.has(e.name)) {
          const n =
            e.name === "node_modules" || e.name === ".git"
              ? 0
              : countFiles(abs);
          if (n)
            excluded.set(
              `dir "${e.name}/"`,
              (excluded.get(`dir "${e.name}/"`) ?? 0) + n
            );
          continue;
        }
        if (isRepoExcluded(rel)) {
          const n = countFiles(abs);
          excluded.set(
            "repo-specific exclusion",
            (excluded.get("repo-specific exclusion") ?? 0) + n
          );
          excludedFiles.push({
            file: `${rel}/`,
            reason: `repo-specific exclusion (directory, ${n} files)`,
          });
          continue;
        }
        walk(abs);
        continue;
      }
      if (!SOURCE_EXT.test(e.name)) continue;
      const pattern = EXCLUDED_FILE_PATTERNS.find(([re]) => re.test(e.name));
      if (pattern) {
        bump(pattern[1]);
        continue;
      }
      if (isRepoExcluded(rel)) {
        bump("repo-specific exclusion", rel);
        continue;
      }
      if (thirdPartyLicense(repo, abs)) {
        bump("third-party license header", rel);
        continue;
      }
      included.push(rel);
    }
  };

  for (const inc of repo.include) {
    const abs = join(repo.root, inc);
    if (!statSync(abs).isDirectory())
      throw new Error(`Included path is not a directory: ${abs}`);
    walk(abs);
  }
  included.sort();
  return {
    repo,
    files: included,
    excluded: Object.fromEntries(excluded),
    excludedFiles,
  };
}

function headerFlags(repo, files) {
  const flagged = [];
  for (const rel of files) {
    const text = readFileSync(join(repo.root, rel), "utf8");
    const head = text.slice(0, 3000);
    const m = head.match(HEADER_FLAGS);
    const lines = text.split("\n");
    const longest = lines.reduce((a, l) => Math.max(a, l.length), 0);
    const big = text.length > 150_000;
    if (m || longest > 2000 || big) {
      flagged.push({
        file: rel,
        match: m?.[0] ?? null,
        bytes: text.length,
        longestLine: longest,
      });
    }
  }
  return flagged;
}

module.exports = {
  collect,
  config,
  getRepo,
  headerFlags,
  EXCLUDED_DIR_NAMES,
  EXCLUDED_FILE_PATTERNS,
};

function main(name, rest) {
  const { repo, files, excluded, excludedFiles } = collect(name);
  const byExt = {};
  for (const f of files) {
    const ext = f.slice(f.lastIndexOf("."));
    byExt[ext] = (byExt[ext] ?? 0) + 1;
  }
  console.log(
    JSON.stringify(
      { repo: repo.name, included: files.length, byExt, excluded },
      null,
      2
    )
  );
  if (rest.includes("--flags")) {
    for (const f of headerFlags(repo, files))
      console.log("FLAG", JSON.stringify(f));
  }
  if (rest.includes("--list")) for (const f of files) console.log(f);
  if (rest.includes("--excluded"))
    for (const f of excludedFiles) console.log("EXCL", f.reason, f.file);
}

if (require.main === module) {
  const [name, ...rest] = process.argv.slice(2);
  const names = name === "--all" ? config.repos.map((r) => r.name) : [name];
  for (const n of names) main(n, rest);
}
