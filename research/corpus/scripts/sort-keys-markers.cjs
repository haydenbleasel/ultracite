// Policy: does any corpus repo sort its keys on purpose?
//
//   configs    every lint and format config in each repo at its pinned commit (ESLint flat and
//              legacy, Biome, Oxlint, Prettier, dprint, package.json), from `git ls-tree` and
//              `git show` on the history clone (or the corpus clone for the React set and
//              Ultracite), with the lines that name a key-sorting rule or plugin: sort-keys,
//              sort-keys-fix, perfectionist (sort-objects and its configs), typescript-sort-keys,
//              sort-destructure-keys, jsonc/sort-keys, Biome's useSortedKeys, and shared configs
//              that turn sort-keys on implicitly (eslint:all, `configs.all`)
//   packages   devDependencies of the root and measured package.json that sort keys
//   disables   disable comments in the corpus files that name one of those rules
//   enforcing  for each repo, the share of its objects already sorted (from the census), to set a
//              repo that enforces sorting against the rest
//
// Usage: node research/corpus/scripts/sort-keys-markers.cjs
// Writes results/sort-keys/markers.json.
"use strict";

const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./sort-keys-lib.cjs");

const { dc } = lib;
const RULE_RE =
  /\bsort-keys(?:-fix)?\b|sortKeys|perfectionist|sort-objects|typescript-sort-keys|sort-destructure-keys|useSortedKeys|useSortedInterfaceMembers|useSortedAttributes|jsx-sort-props|member-ordering|sort-type-constituents|sort-imports|organizeImports/;
const KEY_RULE_RE =
  /\bsort-keys(?:-fix)?\b|sortKeys|perfectionist\/sort-objects|sort-objects|typescript-sort-keys|useSortedKeys/;
const CONFIG_RE =
  /(?:^|\/)(?:\.eslintrc(?:\.(?:js|cjs|mjs|json|ya?ml))?|eslint\.config\.(?:js|cjs|mjs|ts|mts|cts)|biome\.jsonc?|\.oxlintrc\.json|oxlint\.config\.(?:ts|mts|js|mjs|json)|\.prettierrc(?:\.(?:js|cjs|mjs|json|ya?ml|toml))?|prettier\.config\.(?:js|cjs|mjs|ts)|dprint\.jsonc?|\.dprint\.jsonc?)$/;
const SKIP_DIR_RE =
  /(?:^|\/)(?:node_modules|test|tests|__tests__|__testfixtures__|fixtures?|examples?|e2e|playground|bench(?:mark)?s?|\.vscode-test|templates?|evals)(?:\/|$)/;
const IMPLICIT_RE =
  /eslint:all|configs\.all\b|allConfig|perfectionist[^\n]*configs|configs[^\n]*perfectionist/;
const PACKAGE_RE =
  /"(eslint-plugin-perfectionist|eslint-plugin-sort-keys(?:-fix)?|eslint-plugin-typescript-sort-keys|eslint-plugin-sort-destructure-keys|prettier-plugin-sort-json|prettier-plugin-organize-imports|@trivago\/prettier-plugin-sort-imports|@ianvs\/prettier-plugin-sort-imports|eslint-plugin-simple-import-sort|prettier-plugin-packagejson|sort-package-json)"/g;
const DISABLE_RE =
  /(?:eslint|oxlint)-disable(?:-next-line|-line)?[^\n]*?(?:\bsort-keys(?:-fix)?\b|perfectionist\/sort-objects|typescript-sort-keys)|biome-ignore[^\n]*useSortedKeys/;

const gitIn = (dir, argv) =>
  execFileSync("git", ["-C", dir, "-c", "core.quotePath=false", ...argv], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
    stdio: ["ignore", "pipe", "pipe"],
  });

const configs = (name) => {
  const history = join(lib.HISTORY_DIR, `${name}.git`);
  const dir = existsSync(history) ? history : lib.repoMeta(name).root;
  const sha = lib.shaOf(name);
  const all = gitIn(dir, ["ls-tree", "-r", "--name-only", sha]).split("\n");
  const files = all
    .filter((p) => CONFIG_RE.test(p) && !SKIP_DIR_RE.test(p))
    .filter(
      (p) =>
        name !== "ultracite" ||
        !/^(?:packages\/cli\/config|research|packages\/cli\/__tests__)\//.test(
          p
        )
    );
  const pkgs = all.filter(
    (p) =>
      /(?:^|\/)package\.json$/.test(p) &&
      !SKIP_DIR_RE.test(p) &&
      p.split("/").length <= 3
  );
  const meta = lib.repoMeta(name);
  const out = [];
  for (const path of files.sort()) {
    let text;
    try {
      text = gitIn(dir, ["show", `${sha}:${path}`]);
    } catch {
      continue;
    }
    const lines = text
      .split("\n")
      .map((l, i) => ({ line: i + 1, text: l.trim() }));
    out.push({
      file: path,
      implicit: lines
        .filter((l) => IMPLICIT_RE.test(l.text))
        .map((l) => ({
          ...l,
          permalink: dc.permalink(meta.github, sha, path, l.line),
        })),
      keyRules: lines
        .filter((l) => KEY_RULE_RE.test(l.text))
        .map((l) => ({
          ...l,
          permalink: dc.permalink(meta.github, sha, path, l.line),
        })),
      orderRules: lines
        .filter((l) => RULE_RE.test(l.text) && !KEY_RULE_RE.test(l.text))
        .map((l) => l.text.slice(0, 160)),
      tool: /biome/.test(path)
        ? "biome"
        : /oxlint/.test(path)
          ? "oxlint"
          : /prettier/.test(path)
            ? "prettier"
            : /dprint/.test(path)
              ? "dprint"
              : "eslint",
    });
  }
  const packages = [];
  for (const path of pkgs) {
    let text;
    try {
      text = gitIn(dir, ["show", `${sha}:${path}`]);
    } catch {
      continue;
    }
    for (const m of text.matchAll(PACKAGE_RE)) {
      packages.push({ file: path, package: m[1] });
    }
    if (/"eslintConfig"/.test(text) && KEY_RULE_RE.test(text)) {
      out.push({
        file: `${path} (eslintConfig)`,
        keyRules: [{ text: "names a key-sorting rule" }],
        tool: "eslint",
      });
    }
  }
  return {
    configFiles: out.length,
    configs: out,
    namesAKeyRule: out.filter((c) => c.keyRules.length > 0).map((c) => c.file),
    packages,
  };
};

const census = lib.readJson(join(lib.RESULTS_DIR, "census.json"));
const result = { generated: new Date().toISOString().slice(0, 10), repos: {} };
for (const name of lib.ALL) {
  const { files } = lib.collect(name);
  const root = lib.repoMeta(name).root;
  const disables = [];
  for (const rel of files) {
    const text = readFileSync(join(root, rel), "utf8");
    if (!DISABLE_RE.test(text)) {
      continue;
    }
    text.split("\n").forEach((l, i) => {
      if (DISABLE_RE.test(l)) {
        disables.push({
          file: rel,
          line: i + 1,
          permalink: lib.permalink(name, rel, i + 1),
          text: l.trim().slice(0, 200),
        });
      }
    });
  }
  const c = census.repos[name];
  result.repos[name] = {
    configs: configs(name),
    disableComments: disables,
    set: lib.setOf(name),
    sorted: {
      biome: c.sorted.biome,
      eslint: c.sorted.eslint,
      objects2: c.objects2,
      oxlint: c.sorted.oxlint,
    },
  };
  console.log(
    `${name}: ${result.repos[name].configs.configFiles} configs, key rules in ${JSON.stringify(result.repos[name].configs.namesAKeyRule)}, packages ${JSON.stringify(result.repos[name].configs.packages.map((p) => p.package))}, ${disables.length} disables, sorted ${c.sorted.eslint.pct}%`
  );
}
lib.writeJson(join(lib.RESULTS_DIR, "markers.json"), result);
