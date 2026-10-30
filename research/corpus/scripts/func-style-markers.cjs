// Policy: what each measured project configures for these rules, and the disable comments that
// name them.
//
//   configs     every ESLint, Biome and Oxlint config at the pinned commit (`git show` on the
//               history clones, or the shallow clone's working tree for the React set), skipping
//               test, fixture, example, template, bench, eval and docs paths; every line naming
//               one of the topic's rules, with the lines after it up to the end of its options, a
//               permalink and the commit that added it (`git log -S`, read-only,
//               GIT_NO_LAZY_FETCH=1); and every `extends` line, since shared configs can turn the
//               rules on implicitly
//   directives  every disable comment in the measured files (source and tests) that names one of
//               these rules, with its reason and what's on the line it covers
//
// Usage: node research/corpus/scripts/func-style-markers.cjs [--repos a,b]
// Writes results/func-style/markers.json.
"use strict";

const { join } = require("node:path");

const lib = require("./func-style-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const RULES = [
  "func-style",
  "no-use-before-define",
  "func-names",
  "func-name-matching",
  "prefer-arrow-callback",
  "arrow-body-style",
  "consistent-function-scoping",
  "no-inner-declarations",
  "no-func-assign",
  "function-component-definition",
  "prefer-arrow-functions",
  "prefer-arrow",
  "useArrowFunction",
  "noInvalidUseBeforeDeclaration",
  "useConsistentArrowReturn",
  "useConsistentFunctionStyle",
  "useReactFunctionComponentDefinition",
  "noInnerDeclarations",
  "noFunctionAssign",
];
const RULE_RE = new RegExp(
  `(?:^|[^\\w-])((?:@typescript-eslint/|typescript/|unicorn/|react/|prefer-arrow/|eslint/)?(?:${RULES.map(
    (r) => r.replaceAll("-", "\\-")
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

const configLines = (text) => {
  const lines = text.split("\n");
  const out = [];
  lines.forEach((t, i) => {
    RULE_RE.lastIndex = 0;
    const isComment = /^\s*(?:\/\/|\*|#)/.test(t);
    if (RULE_RE.test(t) && !isComment) {
      // the rule's options, up to the line that closes them
      let j = i;
      let depth = 0;
      const block = [];
      do {
        block.push(lines[j]);
        depth +=
          (lines[j].match(/[[{(]/g) ?? []).length -
          (lines[j].match(/[\]})]/g) ?? []).length;
        j++;
      } while (depth > 0 && j < lines.length && j - i < 15);
      out.push({
        kind: "rule",
        line: i + 1,
        text: block
          .map((x) => x.trim())
          .join(" ")
          .slice(0, 300),
      });
    } else if (
      /\bextends\b|^\s*["']?(?:plugin:|next|airbnb|standard|xo|prettier)/.test(
        t
      ) &&
      !isComment
    ) {
      out.push({ kind: "extends", line: i + 1, text: t.trim().slice(0, 200) });
    }
  });
  return out;
};

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
    paths = lib
      .spawnSync("git", ["-C", root, "ls-files"], { encoding: "utf8" })
      .stdout.split("\n")
      .filter((p) => CONFIG_FILE.test(p) && !SKIP_PATH.test(p))
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
    const lines = configLines(text);
    if (
      !lines.some((l) => l.kind === "rule") &&
      !/(?:eslint\.config|\.eslintrc|biome\.json|\.oxlintrc|oxlint\.config)/.test(
        p
      )
    ) {
      continue;
    }
    out.push({
      file: p,
      lines: lines.map((l) => {
        let added = null;
        if (hasHistory && l.kind === "rule") {
          RULE_RE.lastIndex = 0;
          const needle = RULE_RE.exec(l.text)?.[1] ?? l.text;
          const first = git(name, [
            "log",
            sha,
            "--format=%H %cs %s",
            "--reverse",
            "-S",
            needle,
            "--",
            p,
          ])
            .stdout.split("\n")
            .find(Boolean);
          added = first
            ? {
                date: first.split(" ")[1],
                sha: first.split(" ")[0],
                subject: first.split(" ").slice(2).join(" "),
              }
            : null;
        }
        return {
          ...l,
          added,
          permalink: lib.dc.permalink(meta.github, sha, p, l.line),
        };
      }),
    });
  }
  return out;
};

const main = () => {
  const repos = lib.selectedRepos(lib.ALL);
  const census = lib.readJson(join(lib.RESULTS_DIR, "census.json"), {
    repos: {},
  });
  const result = {
    generated: new Date().toISOString(),
    note: "configs: lint configs at the pinned commit with their lines naming these rules (and `extends` lines); directives: disable comments in the measured files naming one of these rules.",
    repos: {},
    rules: RULES,
  };
  for (const name of repos) {
    const files = lib.readJsonl(join(CENSUS, `${name}.files.jsonl`));
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
        RULE_RE.lastIndex = 0;
        const named = [...m[2].split(/\s--\s|:\s/)[0].matchAll(RULE_RE)].map(
          (x) => x[1]
        );
        if (!named.length) {
          return;
        }
        const target =
          /next-line/.test(m[1]) || m[1] === "biome-ignore" ? i + 1 : i;
        directives.push({
          covers: (lines[target] ?? "").trim().slice(0, 140),
          file: fr.file,
          kind: m[1],
          line: i + 1,
          permalink: lib.permalink(name, fr.file, i + 1),
          reason:
            (
              m[2].split(/\s--\s/)[1] ??
              (m[1].startsWith("biome") ? m[2].split(/:\s/)[1] : null)
            )?.trim() ?? null,
          rules: named,
          test: fr.test,
        });
      });
    }
    const s = census.repos[name]?.source;
    result.repos[name] = {
      configs: configsOf(name),
      directives,
      directivesByRule: directives
        .flatMap((d) => d.rules)
        .reduce((o, r) => ({ ...o, [r]: (o[r] ?? 0) + 1 }), {}),
      shape: s
        ? {
            declarationShare: s.named.declarationShare,
            declarationsUsedAboveDefinition: s.declarations.usedAboveDefinition,
            orderDownShare: s.order.downShare,
            ubdCandidates:
              s.useBeforeDefine.candidates -
              (s.useBeforeDefine.byClass["type-only"] ?? 0),
          }
        : null,
    };
    const ruleLines = result.repos[name].configs.flatMap((c) =>
      c.lines.filter((l) => l.kind === "rule")
    );
    console.log(
      `${name}: ${result.repos[name].configs.length} configs, ${ruleLines.length} rule lines, ${directives.length} directives`
    );
    for (const l of ruleLines) {
      console.log(`   ${l.text.slice(0, 160)} (${l.added?.date ?? "?"})`);
    }
  }
  lib.writeJson(join(lib.RESULTS_DIR, "markers.json"), result);
};

main();
