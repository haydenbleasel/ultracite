// The formatters: every file with a nested ternary, copied and formatted with Oxfmt (Ultracite's
// preset, its ignore patterns dropped) and with Prettier (Ultracite's config, the version in
// packages/cli), with and without experimentalTernaries. Each nested ternary is matched to itself
// across the versions (formatting keeps the order of conditionals) and measured: the lines it
// spans, whether each nested test starts its own line, and how far the formatter indents the
// nested conditionals past the line the ternary starts on.
//
// Then the ping-pong the presets' comment describes, on the corpus: starting from the formatted
// copy, unicorn/no-nested-ternary's fix alone (Oxlint's, then ESLint's), then the formatter again
// (Oxfmt after Oxlint, Prettier after ESLint, and the crossed pairs). A file cycles when the fix
// changes it and the formatter turns it back into the formatted copy.
//
// Usage: node --max-old-space-size=12288 research/corpus/scripts/nested-ternaries-format.cjs [--repos a,b]
// Writes results/nested-ternaries/format.json.
"use strict";

const { readFileSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./nested-ternaries-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const WORK = join(lib.TMP, "format");
const CONFIGS = join(lib.TMP, "configs-format");
const VERSIONS = {
  oxfmt: { tool: "oxfmt" },
  prettier: { tool: "prettier" },
  "prettier-experimental": { experimentalTernaries: true, tool: "prettier" },
};

const indentOf = (line) => /^\s*/.exec(line)[0].replace(/\t/g, "  ").length;
// Per reported nested ternary, in source order: lines, whether each nested conditional's test
// starts a line, and the indentation of those lines past the first line's.
const measureTrees = (text, rel) => {
  const inv = lib.inventory(text, rel);
  if (inv.error) {
    return null;
  }
  const lines = text.split("\n");
  const byRoot = new Map();
  for (const c of inv.conditionals) {
    if (!byRoot.has(c.root)) {
      byRoot.set(c.root, []);
    }
    byRoot.get(c.root).push(c);
  }
  return inv.trees
    .filter((t) => t.slots.consequent + t.slots.alternate > 0)
    .sort((a, b) => a.range[0] - b.range[0])
    .map((t) => {
      const members = byRoot.get(t.root).filter((c) => c.id !== t.root);
      const baseIndent = indentOf(lines[t.line - 1]);
      const ownLine = members.filter((m) => {
        const before = lines[m.line - 1].slice(0, m.column);
        return /^\s*(?:[?:]\s*)?\(?\s*$/.test(before);
      });
      const deltas = members.map(
        (m) => indentOf(lines[m.line - 1]) - baseIndent
      );
      const parenthesized = members.filter((m) => m.parenthesized).length;
      return {
        depth: t.depth,
        indentMax: deltas.length ? Math.max(...deltas) : 0,
        // a chain whose nested tests all sit at one indentation reads as a flat list
        indentSteps: new Set(deltas).size,
        lines: t.lines,
        members: t.members,
        nestedOnOwnLine: ownLine.length,
        parenthesized,
        shape: t.shape,
      };
    });
};

const dist = (xs) => {
  const s = xs
    .filter((x) => x !== null && x !== undefined)
    .sort((a, b) => a - b);
  if (s.length === 0) {
    return null;
  }
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
  return {
    max: s.at(-1),
    mean: Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 100) / 100,
    median: q(0.5),
    n: s.length,
    p90: q(0.9),
    sum: s.reduce((a, b) => a + b, 0),
  };
};

const unicornFix = async (linter, dir, files) => {
  if (linter === "oxlint") {
    lib.sk.oxlintFix({
      configFile: lib.writeOxlintRules(
        CONFIGS,
        "unicorn-nnt",
        { "unicorn/no-nested-ternary": "error" },
        { plugins: ["unicorn"] }
      ),
      cwd: dir,
      files,
    });
    return;
  }
  for (const f of files) {
    const p = join(dir, f);
    const text = readFileSync(p, "utf8");
    const r = lib.linter.verifyAndFix(
      text,
      [
        {
          files: ["**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}"],
          languageOptions: {
            parser: lib.tsParser,
            parserOptions: { ecmaFeatures: { jsx: /\.[jt]sx$/.test(f) } },
          },
          plugins: { unicorn: lib.unicorn },
          rules: { "unicorn/no-nested-ternary": "error" },
        },
      ],
      { filename: f.split("/").at(-1) }
    );
    if (r.output !== text) {
      writeFileSync(p, r.output);
    }
  }
};

const main = async () => {
  const names = lib.selectedRepos(lib.ALL.filter((n) => n !== "ultracite"));
  lib.checkPinned(names);
  rmSync(WORK, { force: true, recursive: true });
  const perVersion = Object.fromEntries(
    ["raw", ...Object.keys(VERSIONS)].map((v) => [v, []])
  );
  const mismatched = [];
  const pingFiles = [];
  for (const name of names) {
    const root = lib.getRepo(name).root;
    const trees = lib.readJsonl(join(CENSUS, `${name}.trees.jsonl`));
    const files = [...new Set(trees.map((t) => t.file))];
    const testOf = new Map(trees.map((t) => [t.file, t.test]));
    for (const v of ["raw", ...Object.keys(VERSIONS)]) {
      for (const f of files) {
        lib.writeText(
          join(WORK, v, name, f),
          readFileSync(join(root, f), "utf8")
        );
      }
    }
    for (const [v, opts] of Object.entries(VERSIONS)) {
      const r = await lib.formatInPlace({
        cwd: join(WORK, v, name),
        files,
        ...opts,
      });
      if (r.status !== 0) {
        console.warn(
          `${name} ${v}: status ${r.status} ${lib.scrub(r.stderr.slice(0, 300))}`
        );
      }
    }
    for (const f of files) {
      const m = {};
      for (const v of ["raw", ...Object.keys(VERSIONS)]) {
        m[v] = measureTrees(readFileSync(join(WORK, v, name, f), "utf8"), f);
      }
      const n = m.raw?.length;
      if (Object.values(m).some((x) => !x || x.length !== n)) {
        mismatched.push(`${name}/${f}`);
        continue;
      }
      for (const v of Object.keys(m)) {
        for (const t of m[v]) {
          perVersion[v].push({
            ...t,
            file: f,
            repo: name,
            test: testOf.get(f),
          });
        }
      }
      // files where unicorn's fix would add parentheses (in the Oxfmt-formatted copy)
      if (
        m.oxfmt.some((t) => t.depth === 2 && t.parenthesized < t.members - 1)
      ) {
        pingFiles.push({ file: f, repo: name });
      }
    }
    console.log(`${name}: ${files.length} files`);
  }
  // the ping-pong on the corpus
  const ping = {};
  for (const [linter, formatter] of [
    ["oxlint", "oxfmt"],
    ["eslint", "prettier"],
    ["oxlint", "prettier"],
    ["eslint", "oxfmt"],
  ]) {
    const dir = join(WORK, `ping-${linter}-${formatter}`);
    rmSync(dir, { force: true, recursive: true });
    const files = pingFiles.map((p) => `${p.repo}/${p.file}`);
    const srcDir = join(WORK, formatter === "oxfmt" ? "oxfmt" : "prettier");
    const f0 = new Map();
    for (const f of files) {
      const t = readFileSync(join(srcDir, f), "utf8");
      f0.set(f, t);
      lib.writeText(join(dir, f), t);
    }
    await unicornFix(linter, dir, files);
    const f1 = new Map(
      files.map((f) => [f, readFileSync(join(dir, f), "utf8")])
    );
    await lib.formatInPlace({ cwd: dir, files, tool: formatter });
    const f2 = new Map(
      files.map((f) => [f, readFileSync(join(dir, f), "utf8")])
    );
    const changedByFix = files.filter((f) => f1.get(f) !== f0.get(f));
    const cycles = changedByFix.filter((f) => f2.get(f) === f0.get(f));
    ping[`${linter} fix + ${formatter}`] = {
      changedByFix: changedByFix.length,
      cycles: cycles.length,
      files: files.length,
      notCycling: changedByFix
        .filter((f) => f2.get(f) !== f0.get(f))
        .slice(0, 10),
    };
  }
  const summarise = (rows) => ({
    byDepth: Object.fromEntries(
      [2, 3, 4, 5].map((d) => [
        d === 5 ? "5+" : String(d),
        dist(
          rows
            .filter((r) => (d === 5 ? r.depth >= 5 : r.depth === d))
            .map((r) => r.lines)
        ),
      ])
    ),
    // chains of three or more conditionals that span lines: every nested test at one
    // indentation (a flat list) or at growing indentation (stepped)
    chains: {
      flatIndent: rows.filter(
        (r) =>
          r.shape === "chain" &&
          r.members > 2 &&
          r.lines > 1 &&
          r.indentSteps === 1
      ).length,
      singleLine: rows.filter(
        (r) => r.shape === "chain" && r.members > 2 && r.lines === 1
      ).length,
      steppedIndent: rows.filter(
        (r) =>
          r.shape === "chain" &&
          r.members > 2 &&
          r.lines > 1 &&
          r.indentSteps > 1
      ).length,
      threePlus: rows.filter((r) => r.shape === "chain" && r.members > 2)
        .length,
    },
    indentMax: dist(rows.map((r) => r.indentMax)),
    lines: dist(rows.map((r) => r.lines)),
    multiline: rows.filter((r) => r.lines > 1).length,
    nestedOnOwnLine: {
      all: rows.filter((r) => r.nestedOnOwnLine === r.members - 1).length,
      none: rows.filter((r) => r.nestedOnOwnLine === 0).length,
    },
    parenthesizedTrees: rows.filter((r) => r.parenthesized > 0).length,
    total: rows.length,
  });
  const result = {
    generated: new Date().toISOString(),
    mismatched,
    note: "See the header of nested-ternaries-format.cjs. raw: the files as written; oxfmt, prettier, prettier-experimental: formatted copies. Per version, for the nested ternaries ESLint reports (source, external repos): lines spanned (by depth), nested conditionals whose test starts its own line, indentation of those lines past the ternary's first line (indentMax, in spaces; indentSteps 1 means every nested test sits at one indentation, a flat list), and trees with a parenthesised nested conditional. pingPong: unicorn/no-nested-ternary's fix then a formatter, on the files where the fix would add parentheses.",
    pingPong: ping,
    pingPongFiles: pingFiles.length,
    tools: lib.toolVersions(),
    versions: {},
  };
  for (const [v, rows] of Object.entries(perVersion)) {
    result.versions[v] = {
      source: summarise(rows.filter((r) => !r.test)),
      tests: summarise(rows.filter((r) => r.test)),
    };
  }
  // what formatting does to each tree's line count
  const raw = perVersion.raw.filter((r) => !r.test);
  result.change = {};
  for (const v of Object.keys(VERSIONS)) {
    const rows = perVersion[v].filter((r) => !r.test);
    const d = rows.map((r, i) => r.lines - raw[i].lines);
    result.change[v] = {
      grew: d.filter((x) => x > 0).length,
      lineChange: dist(d),
      same: d.filter((x) => x === 0).length,
      shrank: d.filter((x) => x < 0).length,
    };
  }
  lib.writeJson(join(lib.RESULTS_DIR, "format.json"), result);
  rmSync(CONFIGS, { force: true, recursive: true });
  console.log(
    JSON.stringify(
      {
        change: result.change,
        mismatched: mismatched.length,
        ping,
        versions: Object.fromEntries(
          Object.entries(result.versions).map(([k, v]) => [
            k,
            {
              chains: v.source.chains,
              indentMax: v.source.indentMax,
              lines: v.source.lines,
              ownLine: v.source.nestedOnOwnLine,
              paren: v.source.parenthesizedTrees,
            },
          ])
        ),
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
