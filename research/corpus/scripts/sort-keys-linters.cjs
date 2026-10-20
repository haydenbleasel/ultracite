// The three key-sorting rules on the corpus, as Ultracite configures them, joined object by object
// to the census (sort-keys-census.cjs).
//
//   --corpus   Oxlint's sort-keys (core sets it to "error" with no options; run alone, so only its
//              fix can apply), ESLint's sort-keys (Ultracite's core preset, every other rule
//              filtered out) and Biome's useSortedKeys assist (on alone), on every file of every
//              repo, in two modes:
//                reported  the files as they are: in-file disable comments are honoured
//                raw       ESLint with noInlineConfig; Oxlint and Biome on a mirror with every
//                          eslint-/oxlint-disable and biome-ignore neutralised (same length)
//              Every diagnostic is joined to its object literal (ESLint reports a key, Oxlint the
//              object, Biome the object's first member). The census's reimplementation of each
//              rule must predict the raw reports object by object (the run fails otherwise), and
//              Oxlint's help (present only when it has a fix) must match the predicted fix
//              blocker. Disagreements between linters are explained by comparator, grouping and
//              names.
//
// Usage: node --max-old-space-size=12000 research/corpus/scripts/sort-keys-linters.cjs --corpus
// Writes results/sort-keys/corpus-lint.json and out/sort-keys/lint/<repo>.json.
"use strict";

const {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join } = require("node:path");

const lib = require("./sort-keys-lib.cjs");

const MIRROR = join(lib.TMP, "mirror");
const CONFIG_DIR = join(lib.TMP, "configs");

// Same-length neutralisation of every suppression directive, so offsets don't move.
const DIRECTIVE = /\b(eslint|oxlint)-(disable|enable)|\bbiome-ignore/g;
const neutralise = (text) =>
  text.replace(DIRECTIVE, (m, tool, verb) =>
    tool ? `${"x".repeat(tool.length)}-${verb}` : "xxxxx-ignore"
  );

const writeMirror = (name, files, root) => {
  const dir = join(MIRROR, name);
  rmSync(dir, { force: true, recursive: true });
  let directives = 0;
  for (const rel of files) {
    const text = readFileSync(join(root, rel), "utf8");
    directives += text.match(DIRECTIVE)?.length ?? 0;
    const dest = join(dir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, neutralise(text));
  }
  return { dir, directives };
};

// ── joining diagnostics to objects ─────────────────────────────────────
const indexRows = (rows) => {
  const byFile = new Map();
  for (const r of rows) {
    if (!byFile.has(r.file)) {
      byFile.set(r.file, []);
    }
    byFile.get(r.file).push(r);
  }
  return byFile;
};
const offsetFromLineCol = (starts, line, column) =>
  starts[line - 1] + column - 1;

// ESLint reports the key of the property out of order (UTF-16 columns, 1-based).
const joinEslint = (diags, byFile, texts) => {
  const out = new Map();
  const unmatched = [];
  for (const d of diags) {
    const rows = byFile.get(d.file) ?? [];
    const starts = texts.get(d.file).starts;
    const off = offsetFromLineCol(starts, d.line, d.column);
    const row = rows.find((r) => r.keys.some((k) => k.ks === off));
    if (!row) {
      unmatched.push(d);
      continue;
    }
    const key = `${row.file}:${row.start}`;
    out.set(key, [...(out.get(key) ?? []), d]);
  }
  return { matched: out, unmatched };
};
// Oxlint reports the object (line and 1-based column of `{`).
const joinOxlint = (diags, byFile) => {
  const out = new Map();
  const unmatched = [];
  for (const d of diags) {
    const rows = byFile.get(d.file) ?? [];
    const row =
      rows.find((r) => r.line === d.line && r.column === d.column) ?? null;
    if (!row) {
      unmatched.push(d);
      continue;
    }
    out.set(`${row.file}:${row.start}`, d);
  }
  return { matched: out, unmatched };
};
// Biome reports the member list: the first member's start.
const joinBiome = (diags, byFile) => {
  const out = new Map();
  const unmatched = [];
  for (const d of diags) {
    const rows = byFile.get(d.file) ?? [];
    const row =
      rows.find(
        (r) => r.keys[0].line === d.line && r.keys[0].col === d.column
      ) ?? null;
    if (!row) {
      unmatched.push(d);
      continue;
    }
    out.set(`${row.file}:${row.start}`, d);
  }
  return { matched: out, unmatched };
};

// ── why two linters disagree about an object ───────────────────────────
const firstDiff = (a, b) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) {
    i++;
  }
  return i;
};
const pairKind = (x, y) => {
  const i = firstDiff(x, y);
  const cx = x[i] ?? "";
  const cy = y[i] ?? "";
  if (cx === "" || cy === "") {
    return "prefix";
  }
  if (/\d/.test(cx) && /\d/.test(cy)) {
    return "numbers (natural order)";
  }
  if (
    /[A-Za-z]/.test(cx) &&
    /[A-Za-z]/.test(cy) &&
    cx.toLowerCase() !== cy.toLowerCase() &&
    (cx === cx.toUpperCase()) !== (cy === cy.toUpperCase())
  ) {
    return "upper against lower case";
  }
  if (/[A-Za-z]/.test(cx) && /[A-Za-z]/.test(cy)) {
    return "upper against lower case";
  }
  if (/[_$-]/.test(cx) || /[_$-]/.test(cy)) {
    return "_, $ or - against letters or digits";
  }
  if (/\d/.test(cx) !== /\d/.test(cy)) {
    return "digits against letters";
  }
  return "other characters";
};
// The adjacent pairs inside each group where two comparators disagree.
const comparatorPairs = (row, linterA, linterB) => {
  const names = row.keys.map((k) =>
    linterA === "biome" ? k.b : linterA === "eslint" ? k.e : k.o
  );
  const kinds = new Set();
  // Group the way linterA does.
  let prev = null;
  row.keys.forEach((k, i) => {
    if (k.t === "spread") {
      prev = null;
      return;
    }
    const name = names[i];
    if (name === null) {
      if (linterA === "biome") {
        prev = null;
      }
      return;
    }
    if (prev !== null) {
      const a = lib.COMPARE[linterA](prev, name) > 0;
      const b = lib.COMPARE[linterB](prev, name) > 0;
      if (a !== b) {
        kinds.add(pairKind(prev, name));
      }
    }
    prev = name;
  });
  return [...kinds];
};
// Re-evaluate one linter's verdict with another's grouping or names, to attribute a disagreement.
const sortedWith = (row, { names, compare, splitOnUnnamed }) => {
  let prev = null;
  for (const k of row.keys) {
    if (k.t === "spread") {
      prev = null;
      continue;
    }
    const name = k[names];
    if (name === null) {
      if (splitOnUnnamed) {
        prev = null;
      }
      continue;
    }
    if (prev !== null && compare(prev, name) > 0) {
      return false;
    }
    prev = name;
  }
  return true;
};
const explain = (row, a, b) => {
  const reasons = [];
  if (
    (a === "eslint" && b === "oxlint") ||
    (a === "oxlint" && b === "eslint")
  ) {
    if (row.keys.some((k) => k.t === "computed-identifier")) {
      reasons.push("ESLint names a computed [identifier] key, Oxlint skips it");
    }
    const kinds = comparatorPairs(row, "eslint", "oxlint");
    if (kinds.length) {
      reasons.push(`comparator: ${kinds.join(", ")}`);
    }
    if (row.keys.some((k) => k.t === "number" && k.e !== k.o)) {
      reasons.push("a numeric key spelled differently");
    }
    return reasons.length ? reasons : ["unexplained"];
  }
  const other = a === "biome" ? b : a;
  // Biome against ESLint or Oxlint: grouping first (Biome splits at computed keys), then names, then
  // the comparator.
  const names = other === "eslint" ? "e" : "o";
  const otherCompare = lib.COMPARE[other];
  const biomeGroupingOtherCompare = sortedWith(row, {
    compare: otherCompare,
    names: "b",
    splitOnUnnamed: true,
  });
  const otherVerdict = row.sorted[other];
  const biomeVerdict = row.sorted.biome;
  const otherGroupingBiomeCompare = sortedWith(row, {
    compare: lib.biomeCompare,
    names,
    splitOnUnnamed: false,
  });
  if (
    otherGroupingBiomeCompare === otherVerdict &&
    biomeVerdict !== otherVerdict
  ) {
    // Changing only the comparator to Biome's didn't change the other linter's verdict, so the
    // grouping or the names explain it.
    if (
      row.keys.some(
        (k) => k.t === "computed-identifier" || k.t === "computed-expression"
      )
    ) {
      reasons.push("Biome starts a new group at a computed key");
    }
    if (row.keys.some((k) => k.t === "number" || k.t === "computed-literal")) {
      reasons.push("a numeric or computed literal key read differently");
    }
  }
  if (
    biomeGroupingOtherCompare === otherVerdict ||
    otherGroupingBiomeCompare !== otherVerdict
  ) {
    const kinds = comparatorPairs(row, "biome", other);
    if (kinds.length) {
      reasons.push(`comparator: ${kinds.join(", ")}`);
    }
  }
  return reasons.length ? [...new Set(reasons)] : ["unexplained"];
};

// ── the corpus run ─────────────────────────────────────────────────────
const corpus = async () => {
  const repos = lib.selectedRepos();
  lib.checkPinned(repos);
  const oxConfig = lib.oxlintSortKeysConfig(CONFIG_DIR);
  const bioConfig = lib.biomeAssistConfig(CONFIG_DIR);
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    repos: {},
    tools: lib.toolVersions(),
  };
  const messages = { biome: new Map(), eslint: new Map(), oxlint: new Map() };
  // The example kept for each message shape is the first by repo, file and line, so it doesn't
  // depend on the order Oxlint (which lints in parallel) prints its diagnostics.
  const order = (repo, d) =>
    `${String(lib.ALL.indexOf(repo)).padStart(2, "0")}|${d.file}|${String(d.line).padStart(6, "0")}|${String(d.column).padStart(4, "0")}`;
  const addMessage = (linter, d, shape, repo) => {
    const m = messages[linter];
    const entry = m.get(shape) ?? {
      count: 0,
      example: d,
      rank: order(repo, d),
    };
    if (order(repo, d) < entry.rank) {
      entry.example = d;
      entry.rank = order(repo, d);
    }
    entry.count++;
    m.set(shape, entry);
  };
  for (const name of repos) {
    const t0 = Date.now();
    const { files } = lib.collect(name);
    const root = lib.repoMeta(name).root;
    const rows = lib.readJsonl(join(lib.OUT_DIR, "census", `${name}.jsonl`));
    const byFile = indexRows(rows);
    const texts = new Map(
      files.map((rel) => {
        const text = readFileSync(join(root, rel), "utf8");
        return [rel, { starts: lib.lineStarts(text), text }];
      })
    );
    const mirror = writeMirror(name, files, root);
    const runs = {
      biome: {
        raw: lib.runBiome({ configDir: bioConfig, cwd: mirror.dir, files }),
        reported: lib.runBiome({ configDir: bioConfig, cwd: root, files }),
      },
      eslint: {
        raw: (await lib.runEslint({ cwd: root, files })).filter(
          (d) => d.rule !== "inline-config-ignored"
        ),
        reported: await lib.runEslint({ cwd: root, files, inline: true }),
      },
      oxlint: {
        raw: lib.runOxlint({ configFile: oxConfig, cwd: mirror.dir, files }),
        reported: lib.runOxlint({ configFile: oxConfig, cwd: root, files }),
      },
    };
    // Inline config naming a plugin ESLint doesn't load ("Definition for rule 'ban/ban' was not
    // found") is reported in the reported mode; only parse errors stop the run.
    const parseErrors = [...runs.eslint.raw, ...runs.eslint.reported].filter(
      (d) => d.rule.startsWith("parse:")
    );
    if (parseErrors.length) {
      throw new Error(
        `${name}: ESLint could not parse ${parseErrors.length} files, e.g. ${JSON.stringify(parseErrors[0])}`
      );
    }
    const eslintOther = runs.eslint.reported.filter(
      (d) => d.rule !== "sort-keys"
    ).length;
    runs.eslint.raw = runs.eslint.raw.filter((d) => d.rule === "sort-keys");
    runs.eslint.reported = runs.eslint.reported.filter(
      (d) => d.rule === "sort-keys"
    );
    const joined = {};
    for (const mode of ["raw", "reported"]) {
      joined[mode] = {
        biome: joinBiome(runs.biome[mode], byFile),
        eslint: joinEslint(runs.eslint[mode], byFile, texts),
        oxlint: joinOxlint(runs.oxlint[mode], byFile),
      };
    }
    // Messages, as each linter prints them.
    for (const d of runs.eslint.raw) {
      addMessage("eslint", d, d.message.replace(/'[^']*'/g, "'…'"), name);
    }
    for (const d of runs.oxlint.raw) {
      addMessage(
        "oxlint",
        d,
        `${d.message} | help: ${d.help ? (/^Replace `[\s\S]*` with `[\s\S]*`\.$/.test(d.help) ? "Replace `…` with `…`." : d.help) : "(none)"}`,
        name
      );
    }
    for (const d of runs.biome.raw) {
      addMessage("biome", d, d.message, name);
    }
    // Predicted against real, object by object (raw).
    const mismatches = [];
    const disagreements = [];
    const perObject = [];
    for (const r of rows) {
      const key = `${r.file}:${r.start}`;
      const eslintN = joined.raw.eslint.matched.get(key)?.length ?? 0;
      const ox = joined.raw.oxlint.matched.get(key) ?? null;
      const bio = joined.raw.biome.matched.get(key) ?? null;
      const real = {
        biome: Boolean(bio),
        eslint: eslintN,
        oxlint: Boolean(ox),
        oxlintFix: ox ? Boolean(ox.help) : null,
      };
      const predicted = {
        biome: r.biomeReport,
        eslint: r.eslintReports,
        oxlint: r.oxlintReport,
        oxlintFix: r.oxlintReport ? r.oxlintBlocker === null : null,
      };
      if (JSON.stringify(real) !== JSON.stringify(predicted)) {
        mismatches.push({ file: r.file, line: r.line, predicted, real });
      }
      const reported = {
        biome: joined.reported.biome.matched.has(key),
        eslint: joined.reported.eslint.matched.get(key)?.length ?? 0,
        oxlint: joined.reported.oxlint.matched.has(key),
      };
      perObject.push({
        file: r.file,
        line: r.line,
        raw: real,
        reported,
        start: r.start,
      });
      const flagged = {
        biome: real.biome,
        eslint: real.eslint > 0,
        oxlint: real.oxlint,
      };
      for (const [a, b] of [
        ["eslint", "oxlint"],
        ["oxlint", "biome"],
        ["eslint", "biome"],
      ]) {
        if (flagged[a] !== flagged[b]) {
          disagreements.push({
            file: r.file,
            flaggedBy: flagged[a] ? a : b,
            keys: r.keys
              .map((k) => (k.t === "spread" ? "..." : (k.e ?? `[${k.t}]`)))
              .slice(0, 14),
            line: r.line,
            pair: `${a}/${b}`,
            permalink: lib.permalink(name, r.file, r.line),
            reasons: explain(r, a, b),
          });
        }
      }
    }
    const unmatched = Object.fromEntries(
      Object.entries(joined.raw).map(([linter, j]) => [
        linter,
        j.unmatched.length,
      ])
    );
    const count = (mode, linter) => runs[linter][mode].length;
    const objectsFlagged = (mode, linter) => joined[mode][linter].matched.size;
    const sum = {};
    for (const mode of ["raw", "reported"]) {
      sum[mode] = {
        biomeDiagnostics: count(mode, "biome"),
        eslintDiagnostics: count(mode, "eslint"),
        eslintObjects: objectsFlagged(mode, "eslint"),
        oxlintDiagnostics: count(mode, "oxlint"),
        oxlintWithFix: runs.oxlint[mode].filter((d) => d.help).length,
      };
    }
    const tally = (xs, f) =>
      xs.reduce((a, x) => {
        for (const k of [].concat(f(x))) {
          a[k] = (a[k] ?? 0) + 1;
        }
        return a;
      }, {});
    result.repos[name] = {
      eslintInlineConfigMessages: eslintOther,
      disagreementReasons: Object.fromEntries(
        ["eslint/oxlint", "oxlint/biome", "eslint/biome"].map((pair) => [
          pair,
          {
            byFlagger: tally(
              disagreements.filter((d) => d.pair === pair),
              (d) => `only ${d.flaggedBy}`
            ),
            byReason: tally(
              disagreements.filter((d) => d.pair === pair),
              (d) => d.reasons
            ),
            objects: disagreements.filter((d) => d.pair === pair).length,
          },
        ])
      ),
      files: files.length,
      mismatches: mismatches.length,
      mismatchExamples: mismatches.slice(0, 10),
      neutralisedDirectives: mirror.directives,
      objects2: rows.length,
      seconds: Math.round((Date.now() - t0) / 100) / 10,
      set: lib.setOf(name),
      sha: lib.shaOf(name),
      unmatched,
      ...sum,
    };
    lib.writeJson(join(lib.OUT_DIR, "lint", `${name}.json`), {
      disagreements,
      mismatches,
      perObject,
    });
    console.log(
      `${name}: ${rows.length} objects; raw ESLint ${sum.raw.eslintDiagnostics} on ${sum.raw.eslintObjects}, Oxlint ${sum.raw.oxlintDiagnostics} (${sum.raw.oxlintWithFix} with a fix), Biome ${sum.raw.biomeDiagnostics}; reported ${sum.reported.eslintDiagnostics} / ${sum.reported.oxlintDiagnostics} / ${sum.reported.biomeDiagnostics}; mismatches ${mismatches.length}; unmatched ${JSON.stringify(unmatched)} (${result.repos[name].seconds} s)`
    );
  }
  result.messages = Object.fromEntries(
    Object.entries(messages).map(([linter, m]) => [
      linter,
      [...m.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([shape, e]) => ({
          count: e.count,
          example: { help: e.example.help ?? null, message: e.example.message },
          shape,
        })),
    ])
  );
  const totalMismatches = Object.values(result.repos).reduce(
    (s, r) => s + r.mismatches,
    0
  );
  const totalUnmatched = Object.values(result.repos).reduce(
    (s, r) => s + Object.values(r.unmatched).reduce((x, y) => x + y, 0),
    0
  );
  result.checks = { mismatches: totalMismatches, unmatched: totalUnmatched };
  if (repos.length === lib.ALL.length) {
    lib.writeJson(join(lib.RESULTS_DIR, "corpus-lint.json"), result);
  } else {
    lib.writeJson(join(lib.OUT_DIR, "corpus-lint-partial.json"), result);
  }
  if (totalMismatches || totalUnmatched) {
    console.error(
      `CHECK FAILED: ${totalMismatches} objects where the reimplementation and a linter differ, ${totalUnmatched} unmatched diagnostics`
    );
    process.exitCode = 1;
  }
};

const main = async () => {
  if (lib.flag("corpus")) {
    await corpus();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

module.exports = { neutralise };
void cpSync;
