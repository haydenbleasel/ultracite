// Policy and suppressions around TODO comments.
//
//   configs       every lint config in each repo at its pinned commit (ESLint flat and legacy,
//                 Biome, Oxlint, and package.json `eslintConfig`), from `git ls-tree` and
//                 `git show` on the history clone (or the corpus clone for the React set), and the
//                 lines that name a TODO-comment rule: no-warning-comments, sonarjs todo-tag /
//                 fixme-tag (S1135, S1134), unicorn/expiring-todo-comments
//   disables      disable comments in the corpus files that name one of those rules
//   neighbours    TODO-family markers that sit inside a suppression comment's reason, or on the line
//                 next to one: @ts-expect-error, @ts-ignore, @ts-nocheck, eslint-disable*,
//                 oxlint-disable*, biome-ignore, prettier-ignore, istanbul / c8 / v8 ignore
//
// Usage: node research/corpus/scripts/todo-markers.cjs
// Writes results/todo-comments/markers.json.
"use strict";

const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./todo-lib.cjs");

const { dc } = lib;
const RULE_RE =
  /no-warning-comments|todo-tag|fixme-tag|expiring-todo-comments|S1135|S1134|warning-comments/;
const CONFIG_RE =
  /(?:^|\/)(?:\.eslintrc(?:\.(?:js|cjs|mjs|json|ya?ml))?|eslint\.config\.(?:js|cjs|mjs|ts|mts|cts)|biome\.jsonc?|\.oxlintrc\.json|oxlint\.config\.(?:ts|mts|js|mjs|json))$/;
// Configs that don't lint the measured code: tests, fixtures, examples, project templates and evals.
const SKIP_DIR_RE =
  /(?:^|\/)(?:node_modules|test|tests|__tests__|__testfixtures__|fixtures?|examples?|e2e|playground|bench(?:mark)?s?|\.vscode-test|templates?|evals)(?:\/|$)/;
// Shared configs that turn on every rule, or a plugin's recommended set that includes one of these
// rules (unicorn's and sonarjs's recommended sets do): an implicit way to enable them.
const IMPLICIT_RE =
  /eslint:all|configs\.all\b|unicorn[^\n]*recommended|recommended[^\n]*unicorn|sonarjs[^\n]*recommended|recommended[^\n]*sonarjs|plugin:sonarjs|plugin:unicorn/;
const SUPPRESSION_RE =
  /@ts-expect-error|@ts-ignore|@ts-nocheck|\b(?:eslint|oxlint)-disable(?:-next-line|-line)?\b|\bbiome-ignore\b|\bprettier-ignore\b|\b(?:istanbul|c8|v8) ignore\b/;
const TERMS = new Set(["TODO", "FIXME", "XXX", "@todo"]);

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
  const files = gitIn(dir, ["ls-tree", "-r", "--name-only", sha])
    .split("\n")
    .filter((p) => CONFIG_RE.test(p) && !SKIP_DIR_RE.test(p))
    // Ultracite's own presets and research configs aren't configs that lint its CLI.
    .filter(
      (p) =>
        name !== "ultracite" || !/^(?:packages\/cli\/config|research)\//.test(p)
    );
  files.push(
    ...["package.json"].filter((p) =>
      gitIn(dir, ["ls-tree", "--name-only", sha, p]).trim()
    )
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
    if (path.endsWith("package.json") && !/"eslintConfig"/.test(text)) {
      continue;
    }
    const all = text
      .split("\n")
      .map((l, i) => ({ line: i + 1, text: l.trim() }));
    const lines = all.filter((l) => RULE_RE.test(l.text));
    const implicit = all.filter((l) => IMPLICIT_RE.test(l.text));
    out.push({
      file: path,
      implicit: implicit.map((l) => ({
        ...l,
        permalink: dc.permalink(meta.github, sha, path, l.line),
      })),
      lines: lines.map((l) => ({
        ...l,
        permalink: dc.permalink(meta.github, sha, path, l.line),
      })),
      tool: /biome/.test(path)
        ? "biome"
        : /oxlint/.test(path)
          ? "oxlint"
          : "eslint",
    });
  }
  return {
    configFiles: out.length,
    configs: out,
    namesARule: out.filter((c) => c.lines.length > 0).map((c) => c.file),
  };
};

const markers = lib.readJson(join(lib.OUT_DIR, "markers.json")).rows;
const result = { generated: new Date().toISOString().slice(0, 10), repos: {} };
for (const name of lib.ALL) {
  const { files } = lib.collect(name);
  const root = lib.repoMeta(name).root;
  const disables = [];
  const neighbours = [];
  const mine = markers.filter(
    (m) => m.repo === name && m.kind === "marker" && TERMS.has(m.term)
  );
  const byFile = new Map();
  for (const m of mine) {
    byFile.set(m.file, [...(byFile.get(m.file) ?? []), m]);
  }
  let suppressionComments = 0;
  for (const rel of files) {
    const text = readFileSync(join(root, rel), "utf8");
    if (!SUPPRESSION_RE.test(text)) {
      continue;
    }
    const { comments } = lib.extractComments(text, rel);
    const sup = comments.filter(
      (c) =>
        SUPPRESSION_RE.test(c.value.trimStart().slice(0, 60)) ||
        /^\s*\*?\s*@ts-(?:expect-error|ignore)/.test(c.value)
    );
    suppressionComments += sup.length;
    for (const c of sup) {
      if (
        RULE_RE.test(c.value) &&
        /(?:eslint|oxlint)-(?:disable|enable)|biome-ignore/.test(c.value)
      ) {
        disables.push({
          file: rel,
          line: c.line,
          text: c.value.trim().slice(0, 200),
        });
      }
    }
    for (const m of byFile.get(rel) ?? []) {
      const own = sup.find((c) => c.line <= m.line && c.endLine >= m.line);
      const near = sup.find(
        (c) =>
          !own &&
          (c.endLine === m.comment.line - 1 ||
            c.line === m.comment.endLine + 1 ||
            c.line === m.comment.line)
      );
      const s = own ?? near;
      if (s) {
        neighbours.push({
          file: rel,
          kind: /@ts-/.exec(s.value)?.[0]
            ? /@ts-expect-error/.test(s.value)
              ? "@ts-expect-error"
              : /@ts-ignore/.test(s.value)
                ? "@ts-ignore"
                : "@ts-nocheck"
            : /eslint-disable/.test(s.value)
              ? "eslint-disable"
              : /oxlint-disable/.test(s.value)
                ? "oxlint-disable"
                : /biome-ignore/.test(s.value)
                  ? "biome-ignore"
                  : /prettier-ignore/.test(s.value)
                    ? "prettier-ignore"
                    : "coverage ignore",
          line: m.line,
          placement: own
            ? "in the directive's own comment"
            : "on the next line",
          text: (own ? s.value : `${s.value} / ${m.comment.value}`)
            .trim()
            .slice(0, 200),
        });
      }
    }
  }
  const tally = (xs, key) =>
    xs.reduce((a, x) => ({ ...a, [x[key]]: (a[x[key]] ?? 0) + 1 }), {});
  result.repos[name] = {
    configs: configs(name),
    disableCommentsNamingTheRules: disables,
    markers: mine.length,
    neighbours,
    neighboursByKind: tally(neighbours, "kind"),
    neighboursByPlacement: tally(neighbours, "placement"),
    set: lib.setOf(name),
    suppressionComments,
  };
  console.log(
    `${name}: ${result.repos[name].configs.configFiles} configs (${result.repos[name].configs.namesARule.length} name a rule), ${disables.length} disables, ${neighbours.length} markers next to a suppression`
  );
}
lib.writeJson(join(lib.RESULTS_DIR, "markers.json"), result);
