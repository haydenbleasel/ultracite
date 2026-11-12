// Two fixes in Ultracite's presets that write conditionals, applied alone to copies of the corpus:
//
//   leaked-render   react/jsx-no-leaked-render (ESLint react preset, default options: the fix
//                   strategy is a ternary) with `eslint --fix`, on every .tsx and .jsx file: how
//                   many reports it fixes, and how many nested ternaries the fix creates (counted
//                   with the census's inventory before and after, and by no-nested-ternary)
//   logical         unicorn/prefer-logical-operator-over-ternary in Oxlint, with --fix-dangerously
//                   (what `ultracite fix --unsafe` applies; Oxlint calls the fix a suggestion), on
//                   every file with an `x ? x : …` conditional: every conditional whose test and
//                   consequent are the same text, by what its alternate is, and whether the fixed
//                   text keeps the meaning. A fix that writes `x || y ? a : b` for
//                   `x ? x : y ? a : b` turns the alternate's test into part of the condition.
//                   ESLint's version is a suggestion that `eslint --fix` doesn't apply; its text is
//                   recorded for the same conditionals.
//
// Usage: node --max-old-space-size=12288 research/corpus/scripts/nested-ternaries-fixes.cjs
// Writes results/nested-ternaries/fixes.json.
"use strict";

const { readFileSync, rmSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./nested-ternaries-lib.cjs");

const WORK = join(lib.TMP, "fixes");
const CONFIGS = join(lib.TMP, "configs-fixes");
const REPOS = [...lib.CORE, ...lib.REACT];

const reactPlugin = require(
  require.resolve("eslint-plugin-react", { paths: [lib.CLI] })
);
const nestedCount = (text, rel) => {
  const inv = lib.inventory(text, rel);
  return inv.error
    ? null
    : inv.trees.filter((t) => t.slots.consequent + t.slots.alternate > 0)
        .length;
};

const leakedRender = () => {
  const out = { byRepo: {}, examples: [] };
  for (const name of REPOS) {
    const root = lib.getRepo(name).root;
    const files = lib
      .filesOf(name)
      .filter((f) => !f.test && /\.[jt]sx$/.test(f.rel))
      .map((f) => f.rel);
    const row = {
      files: files.length,
      filesChanged: 0,
      nestedAfter: 0,
      nestedBefore: 0,
      reports: 0,
    };
    for (const rel of files) {
      const text = readFileSync(join(root, rel), "utf8");
      const config = [
        {
          files: ["**/*.{tsx,jsx}"],
          languageOptions: {
            parser: lib.tsParser,
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          linterOptions: {
            noInlineConfig: true,
            reportUnusedDisableDirectives: "off",
          },
          plugins: { react: reactPlugin },
          rules: { "react/jsx-no-leaked-render": "error" },
          settings: { react: { version: "19.0" } },
        },
      ];
      const filename = rel.split("/").at(-1);
      const reports = lib.linter
        .verify(text, config, { filename })
        .filter((m) => m.ruleId);
      if (reports.length === 0) {
        continue;
      }
      row.reports += reports.length;
      const fixed = lib.linter.verifyAndFix(text, config, { filename }).output;
      if (fixed === text) {
        continue;
      }
      row.filesChanged++;
      const before = nestedCount(text, rel);
      const after = nestedCount(fixed, rel);
      row.nestedBefore += before ?? 0;
      row.nestedAfter += after ?? 0;
      if (after > before && out.examples.length < 12) {
        out.examples.push({
          added: after - before,
          file: rel,
          permalink: lib.permalink(name, rel, reports[0].line),
          repo: name,
        });
      }
    }
    row.nestedCreated = row.nestedAfter - row.nestedBefore;
    out.byRepo[name] = row;
    console.log(`leaked-render ${name}: ${JSON.stringify(row)}`);
  }
  out.total = Object.values(out.byRepo).reduce((o, r) => {
    for (const k of Object.keys(r)) {
      o[k] = (o[k] ?? 0) + r[k];
    }
    return o;
  }, {});
  return out;
};

const logical = async () => {
  const cfg = lib.writeOxlintRules(
    CONFIGS,
    "logical",
    { "unicorn/prefer-logical-operator-over-ternary": "error" },
    { plugins: ["unicorn"] }
  );
  const rows = [];
  for (const name of REPOS) {
    const root = lib.getRepo(name).root;
    const files = lib
      .filesOf(name)
      .filter((f) => !f.test)
      .map((f) => f.rel);
    const candidates = [];
    for (const rel of files) {
      const text = readFileSync(join(root, rel), "utf8");
      if (!text.includes("?")) {
        continue;
      }
      const { ast } = lib.sk.safeParse(text, rel);
      if (!ast) {
        continue;
      }
      const sites = [];
      lib.sk.walk(ast, (n) => {
        if (
          n.type === "ConditionalExpression" &&
          text.slice(...n.test.range).replace(/\s+/g, "") ===
            text.slice(...n.consequent.range).replace(/\s+/g, "")
        ) {
          const alt = n.alternate;
          const [s, e] = alt.range;
          let i = s - 1;
          while (/\s/.test(text[i])) {
            i--;
          }
          const parenthesized = text[i] === "(";
          sites.push({
            alternate: alt.type,
            line: n.loc.start.line,
            parenthesized,
            test: text.slice(...n.test.range),
            text: text.slice(
              n.range[0],
              Math.min(n.range[1], n.range[0] + 200)
            ),
            altEnd: e,
          });
        }
      });
      if (sites.length) {
        candidates.push({ rel, sites, text });
      }
    }
    // copies, fixed with the dangerous pass
    const dir = join(WORK, "logical", name);
    rmSync(dir, { force: true, recursive: true });
    for (const c of candidates) {
      lib.writeText(join(dir, c.rel), c.text);
    }
    if (candidates.length) {
      lib.sk.oxlintFix({
        configFile: cfg,
        cwd: dir,
        dangerously: true,
        files: candidates.map((c) => c.rel),
      });
    }
    for (const c of candidates) {
      const fixed = readFileSync(join(dir, c.rel), "utf8");
      const { ast } = lib.sk.safeParse(fixed, c.rel);
      // in the fixed file: `x || y ? a : b` (a conditional whose test is `x || …`) or `x || (…)`
      const broken = [];
      const kept = [];
      if (ast) {
        lib.sk.walk(ast, (n) => {
          if (
            n.type === "ConditionalExpression" &&
            n.test.type === "LogicalExpression" &&
            n.test.operator === "||"
          ) {
            broken.push(fixed.slice(...n.test.left.range).replace(/\s+/g, ""));
          }
          if (n.type === "LogicalExpression" && n.operator === "||") {
            kept.push(fixed.slice(...n.left.range).replace(/\s+/g, ""));
          }
        });
      }
      for (const s of c.sites) {
        const t = s.test.replace(/\s+/g, "");
        // a conditional alternate without parentheses is the case the fix can break
        const risky =
          s.alternate === "ConditionalExpression" && !s.parenthesized;
        rows.push({
          alternate: s.alternate,
          file: c.rel,
          fixedParses: Boolean(ast),
          line: s.line,
          parenthesized: s.parenthesized,
          permalink: lib.permalink(name, c.rel, s.line),
          precedenceChanged: risky && broken.includes(t),
          repo: name,
          rewritten: !fixed.includes(s.text) || kept.includes(t),
          text: s.text.replace(/\s+/g, " ").slice(0, 160),
        });
      }
    }
    console.log(`logical ${name}: ${candidates.length} files`);
  }
  const countBy = (xs, f) =>
    xs.reduce((o, x) => {
      const k = f(x);
      o[k] = (o[k] ?? 0) + 1;
      return o;
    }, {});
  return {
    byAlternate: countBy(
      rows,
      (r) => `${r.alternate}${r.parenthesized ? " (parenthesized)" : ""}`
    ),
    precedenceChanged: rows.filter((r) => r.precedenceChanged),
    sites: rows.length,
    unparsable: rows.filter((r) => !r.fixedParses).length,
  };
};

const main = async () => {
  const result = {
    generated: new Date().toISOString(),
    leakedRender: leakedRender(),
    logical: await logical(),
    note: "See the header of nested-ternaries-fixes.cjs. External source files only.",
    tools: lib.toolVersions(),
  };
  lib.writeJson(
    join(lib.RESULTS_DIR, "fixes.json"),
    JSON.parse(lib.scrub(JSON.stringify(result)))
  );
  rmSync(CONFIGS, { force: true, recursive: true });
  console.log(
    JSON.stringify(
      {
        leaked: result.leakedRender.total,
        logical: {
          byAlternate: result.logical.byAlternate,
          precedenceChanged: result.logical.precedenceChanged.length,
          sites: result.logical.sites,
        },
      },
      null,
      1
    )
  );
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
