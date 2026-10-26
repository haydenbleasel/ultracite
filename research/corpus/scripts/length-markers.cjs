// Policy: whether the measured projects enforce these limits themselves, and how often their code
// suppresses them.
//
//   configs     every ESLint, Biome and Oxlint config in each repo at its pinned commit (`git show`
//               on the history clones, or the working tree of the React set's shallow clones), every
//               line naming a length or structure rule, with a permalink; and when the setting was
//               added (`git log -S` on the history clone, read-only, GIT_NO_LAZY_FETCH=1)
//   directives  every disable comment in the measured files (source and tests) that names one of
//               these rules, with its scope, its reason, and the function or file it covers
//   enforced    where a repo enforces a limit, its distribution next to the other repos'
//
// Usage: node research/corpus/scripts/length-markers.cjs [--repos a,b]
// Needs out/length-limits/census. Writes results/length-limits/markers.json.
"use strict";

const { join } = require("node:path");

const lib = require("./length-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const RULES = [
  "max-lines",
  "max-lines-per-function",
  "max-statements",
  "max-params",
  "max-depth",
  "max-nested-callbacks",
  "max-classes-per-file",
  "complexity",
  "sonarjs/max-lines",
  "sonarjs/max-lines-per-function",
  "sonarjs/max-switch-cases",
  "sonarjs/max-union-size",
  "sonarjs/nested-control-flow",
  "sonarjs/cognitive-complexity",
  "noExcessiveLinesPerFunction",
  "noExcessiveLinesPerFile",
  "noExcessiveStatementsPerFunction",
  "noExcessiveNestedCallbacks",
  "noExcessiveClassesPerFile",
  "noExcessiveCognitiveComplexity",
  "useMaxParams",
];
const RULE_RE = new RegExp(
  `(?:^|[^\\w/-])((?:@typescript-eslint/|typescript/|sonarjs/|eslint/)?(?:${RULES.map(
    (r) => r.replace(/^sonarjs\//, "").replaceAll("-", "\\-")
  ).join("|")}))(?![\\w-])`,
  "g"
);
const CONFIG_FILE =
  /(?:^|\/)(?:\.eslintrc(?:\.(?:js|cjs|json|ya?ml))?|eslint\.config\.[cm]?[jt]s|biome\.jsonc?|\.oxlintrc\.json|oxlint\.config\.[cm]?[jt]s|package\.json)$/;
const SKIP_PATH =
  /(?:^|\/)(?:node_modules|test|tests|__tests__|fixtures?|examples?|templates?|e2e|bench|evals?|docs?)\//;
const DIRECTIVE =
  /(eslint-disable(?:-next-line|-line)?|eslint-enable|oxlint-disable(?:-next-line|-line)?|biome-ignore(?:-all|-start|-end)?)\b([^\n]*)/;

const git = (name, argv) =>
  lib.spawnSync(
    "git",
    [
      "-C",
      join(lib.HISTORY_DIR, `${name}.git`),
      "-c",
      "core.quotePath=false",
      ...argv,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, GIT_NO_LAZY_FETCH: "1" },
      maxBuffer: 1 << 28,
    }
  );

const configLines = (text, path) =>
  text
    .split("\n")
    .map((l, i) => ({ line: i + 1, text: l }))
    .filter(({ text: t }) => {
      RULE_RE.lastIndex = 0;
      // Biome's "complexity" is a rule group, not ESLint's complexity rule
      if (/biome\.jsonc?$/.test(path) && /"complexity"\s*:\s*\{/.test(t)) {
        return false;
      }
      return RULE_RE.test(t) && !/^\s*\/\//.test(t.replace(/^\s*\*/, "//"));
    })
    .map((x) => ({ ...x, text: x.text.trim().slice(0, 200) }));

const configsOf = (name) => {
  const meta = lib.repoMeta(name);
  const sha = lib.shaOf(name);
  const hasHistory = lib.existsSync(join(lib.HISTORY_DIR, `${name}.git`));
  let paths;
  let read;
  if (hasHistory) {
    paths = git(name, ["ls-tree", "-r", "--name-only", sha])
      .stdout.split("\n")
      .filter((p) => CONFIG_FILE.test(p) && !SKIP_PATH.test(p));
    read = (p) => git(name, ["show", `${sha}:${p}`]).stdout;
  } else {
    const root = lib.getRepo(name).root;
    const r = lib.spawnSync("git", ["-C", root, "ls-files"], {
      encoding: "utf8",
    });
    paths = r.stdout
      .split("\n")
      .filter((p) => CONFIG_FILE.test(p) && !SKIP_PATH.test(p))
      // Ultracite's own repo: only its root config applies to its source (the rest are the
      // presets it ships and research fixtures)
      .filter((p) => name !== "ultracite" || !p.includes("/"));
    read = (p) =>
      lib.existsSync(join(root, p))
        ? lib.readFileSync(join(root, p), "utf8")
        : "";
  }
  const out = [];
  for (const p of paths) {
    const text = read(p);
    if (p.endsWith("package.json") && !/"eslintConfig"/.test(text)) {
      continue;
    }
    const lines = configLines(text, p);
    if (
      lines.length === 0 &&
      !/(?:^|\/)(?:eslint\.config|\.eslintrc|biome\.json|\.oxlintrc|oxlint\.config)/.test(
        p
      )
    ) {
      continue;
    }
    // when each setting was added
    const added = hasHistory
      ? lines.map((l) => {
          const needle =
            l.text.match(/['"]?([\w@/-]+)['"]?\s*:/)?.[1] ?? l.text;
          const r = git(name, [
            "log",
            sha,
            "--format=%H %cs %s",
            "--reverse",
            "-S",
            needle,
            "--",
            p,
          ]);
          const first = r.stdout.split("\n").find(Boolean) ?? null;
          return first
            ? {
                date: first.split(" ")[1],
                sha: first.split(" ")[0],
                subject: first.split(" ").slice(2).join(" "),
              }
            : null;
        })
      : lines.map(() => null);
    out.push({
      file: p,
      lines: lines.map((l, i) => ({
        ...l,
        added: added[i],
        permalink: lib.dc.permalink(meta.github, sha, p, l.line),
      })),
    });
  }
  return out;
};

const main = () => {
  const repos = lib.selectedRepos();
  const result = {
    generated: new Date().toISOString(),
    note: "configs: every lint config at the pinned commit (test, fixture, example, template, bench, eval and docs paths skipped) and its lines naming a length or structure rule; `added` is the first commit whose diff of that file contains the setting (git log -S). directives: every disable comment in the measured files naming one of these rules; `covers` is the function that starts on the next line (next-line), the same line (line) or the whole file (block at the top).",
    repos: {},
    rules: RULES,
  };
  for (const name of repos) {
    const fns = lib.readJsonl(join(CENSUS, `${name}.functions.jsonl`));
    const files = lib.readJsonl(join(CENSUS, `${name}.files.jsonl`));
    const byFile = new Map();
    for (const f of fns) {
      if (!byFile.has(f.file)) {
        byFile.set(f.file, []);
      }
      byFile.get(f.file).push(f);
    }
    const repo = lib.getRepo(name);
    const directives = [];
    for (const fr of files) {
      const text = lib.readFileSync(join(repo.root, fr.file), "utf8");
      if (!/(?:eslint|oxlint)-(?:disable|enable)|biome-ignore/.test(text)) {
        continue;
      }
      const lines = text.split("\n");
      lines.forEach((l, i) => {
        const m = DIRECTIVE.exec(l);
        if (!m) {
          return;
        }
        const body = m[2];
        RULE_RE.lastIndex = 0;
        const named = [...body.split(/\s--\s|:\s/)[0].matchAll(RULE_RE)].map(
          (x) => x[1]
        );
        if (named.length === 0) {
          return;
        }
        const kind = m[1];
        const line = i + 1;
        const target =
          /next-line/.test(kind) || kind === "biome-ignore" ? line + 1 : line;
        const covers = /disable$|ignore-all|ignore-start/.test(kind)
          ? "block"
          : ((byFile.get(fr.file) ?? []).find(
              (f) => f.embedStartLine === target || f.startLine === target
            ) ?? null);
        directives.push({
          covers:
            covers === "block"
              ? "block"
              : covers
                ? {
                    cognitive: covers.cognitive,
                    lines: covers.lines,
                    name: covers.name,
                    params: covers.paramsEslint,
                    statements: covers.statements,
                  }
                : null,
          file: fr.file,
          kind,
          line,
          permalink: lib.permalink(name, fr.file, line),
          reason:
            (
              body.split(/\s--\s/)[1] ??
              (kind.startsWith("biome") ? body.split(/:\s/)[1] : null)
            )?.trim() ?? null,
          rules: named,
          test: fr.test,
          text: l.trim().slice(0, 200),
        });
      });
    }
    result.repos[name] = {
      configs: configsOf(name),
      directives,
      directivesByRule: lib.countBy(
        directives.flatMap((d) => d.rules),
        (r) => r
      ),
    };
    console.log(
      `${name}: ${result.repos[name].configs.length} configs, ${result.repos[name].configs.reduce((s, c) => s + c.lines.length, 0)} rule lines, ${directives.length} directives`
    );
  }
  lib.writeJson(join(lib.RESULTS_DIR, "markers.json"), result);
};

main();
