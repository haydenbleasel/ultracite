// What each length limit would report on the corpus, the React set and Ultracite's CLI, source and
// tests apart, in every linter, each rule on its own: at its lowest threshold (so every function
// carries each linter's count), at its default, and at the common settings. Every diagnostic is
// joined to the census function (or file) it is about, and every disagreement between
// implementations is explained from what each counts.
//
//   ESLint   the census pass already ran every rule at 0 (length-census.cjs); this script runs
//            them again for real at their defaults and the common settings (aliases of the same
//            rule modules), on the clones with inline config ignored, and checks that the flagged
//            sets equal the census counts over each threshold
//   SonarJS  max-lines-per-function (200), max-lines (1000), max-switch-cases (30),
//            max-union-size (3), nested-control-flow (3), in the same ESLint pass
//   Oxlint   each rule alone (every category off) at 0, at its default and at the settings
//   Biome    each rule alone at its minimum, at its default and at the settings (and
//            noExcessiveNestedCallbacks at Ultracite's 10)
//
// Oxlint and Biome lint a mirror under TMP with every disable directive neutralised (same length),
// so all three count every occurrence ("raw"); ESLint gets noInlineConfig.
//
// Usage: node --max-old-space-size=12288 research/corpus/scripts/length-linters.cjs [--repos a,b]
// Needs out/length-limits/census (length-census.cjs). Writes results/length-limits/corpus-lint.json
// and out/length-limits/lint/<repo>.jsonl (per function: every linter's count and flags).
"use strict";

const { dirname, join } = require("node:path");

const lib = require("./length-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const MIRROR = join(lib.TMP, "mirror");
const CONFIGS = join(lib.TMP, "configs", "linters");

const neutralise = (t) =>
  t
    .replace(
      /\b(eslint|oxlint)-(disable|enable)/g,
      (_, tool, verb) => `${"x".repeat(tool.length)}-${verb}`
    )
    .replace(/\bbiome-ignore/g, "xxxxx-ignore");

// ── the runs ───────────────────────────────────────────────────────────
// [view, rule, threshold, config] — threshold null is the counting run.
const OX = [
  ["lines", "max-lines-per-function", 0, ["error", { max: 0 }]],
  ["lines", "max-lines-per-function", 50, "error"],
  ["lines", "max-lines-per-function", 100, ["error", { max: 100 }]],
  ["statements", "max-statements", 0, ["error", 0]],
  ["statements", "max-statements", 10, "error"],
  ["statements", "max-statements", 20, ["error", 20]],
  ["statements", "max-statements", 30, ["error", 30]],
  ["params", "max-params", 0, ["error", 0]],
  ["params", "max-params", 3, "error"],
  ["params", "max-params", 4, ["error", 4]],
  ["params", "max-params", 5, ["error", 5]],
  ["params", "max-params", 7, ["error", 7]],
  ["depth", "max-depth", 0, ["error", 0]],
  ["depth", "max-depth", 4, "error"],
  ["callbacks", "max-nested-callbacks", 0, ["error", 0]],
  ["callbacks", "max-nested-callbacks", 10, "error"],
  ["fileLines", "max-lines", 0, ["error", { max: 0 }]],
  ["fileLines", "max-lines", 300, "error"],
  ["fileLines", "max-lines", 500, ["error", { max: 500 }]],
  ["fileLines", "max-lines", 1000, ["error", { max: 1000 }]],
  ["classes", "max-classes-per-file", 0, ["error", 0]],
  ["classes", "max-classes-per-file", 1, "error"],
];
const B = (group, rule, options) => ({
  [group]: {
    [rule]: options === undefined ? "error" : { level: "error", options },
  },
});
const BI = [
  [
    "lines",
    "complexity/noExcessiveLinesPerFunction",
    1,
    B("complexity", "noExcessiveLinesPerFunction", { maxLines: 1 }),
  ],
  [
    "lines",
    "complexity/noExcessiveLinesPerFunction",
    50,
    B("complexity", "noExcessiveLinesPerFunction"),
  ],
  [
    "lines",
    "complexity/noExcessiveLinesPerFunction",
    100,
    B("complexity", "noExcessiveLinesPerFunction", { maxLines: 100 }),
  ],
  [
    "statements",
    "nursery/noExcessiveStatementsPerFunction",
    0,
    B("nursery", "noExcessiveStatementsPerFunction", { max: 0 }),
  ],
  [
    "statements",
    "nursery/noExcessiveStatementsPerFunction",
    10,
    B("nursery", "noExcessiveStatementsPerFunction"),
  ],
  [
    "statements",
    "nursery/noExcessiveStatementsPerFunction",
    20,
    B("nursery", "noExcessiveStatementsPerFunction", { max: 20 }),
  ],
  [
    "statements",
    "nursery/noExcessiveStatementsPerFunction",
    30,
    B("nursery", "noExcessiveStatementsPerFunction", { max: 30 }),
  ],
  [
    "params",
    "complexity/useMaxParams",
    0,
    B("complexity", "useMaxParams", { max: 0 }),
  ],
  [
    "params",
    "complexity/useMaxParams",
    3,
    B("complexity", "useMaxParams", { max: 3 }),
  ],
  ["params", "complexity/useMaxParams", 4, B("complexity", "useMaxParams")],
  [
    "params",
    "complexity/useMaxParams",
    5,
    B("complexity", "useMaxParams", { max: 5 }),
  ],
  [
    "params",
    "complexity/useMaxParams",
    7,
    B("complexity", "useMaxParams", { max: 7 }),
  ],
  [
    "callbacks",
    "complexity/noExcessiveNestedCallbacks",
    5,
    B("complexity", "noExcessiveNestedCallbacks"),
  ],
  [
    "callbacks",
    "complexity/noExcessiveNestedCallbacks",
    10,
    B("complexity", "noExcessiveNestedCallbacks", { max: 10 }),
  ],
  [
    "fileLines",
    "style/noExcessiveLinesPerFile",
    1,
    B("style", "noExcessiveLinesPerFile", { maxLines: 1 }),
  ],
  [
    "fileLines",
    "style/noExcessiveLinesPerFile",
    300,
    B("style", "noExcessiveLinesPerFile"),
  ],
  [
    "fileLines",
    "style/noExcessiveLinesPerFile",
    500,
    B("style", "noExcessiveLinesPerFile", { maxLines: 500 }),
  ],
  [
    "fileLines",
    "style/noExcessiveLinesPerFile",
    1000,
    B("style", "noExcessiveLinesPerFile", { maxLines: 1000 }),
  ],
  [
    "classes",
    "style/noExcessiveClassesPerFile",
    1,
    B("style", "noExcessiveClassesPerFile"),
  ],
];
const DEFAULTS = {
  biome: {
    callbacks: 5,
    classes: 1,
    fileLines: 300,
    lines: 50,
    params: 4,
    statements: 10,
  },
  eslint: {
    callbacks: 10,
    classes: 1,
    depth: 4,
    fileLines: 300,
    lines: 50,
    params: 3,
    statements: 10,
  },
  oxlint: {
    callbacks: 10,
    classes: 1,
    depth: 4,
    fileLines: 300,
    lines: 50,
    params: 3,
    statements: 10,
  },
  sonarjs: {
    fileLines: 1000,
    lines: 200,
    nesting: 3,
    switchCases: 30,
    unionSize: 3,
  },
};
// The ESLint pass at defaults and settings: [view, rule alias, base rule, threshold, options]
const ES = [
  ["lines", "max-lines-per-function", "max-lines-per-function", 50, "error"],
  ["lines", "len/mlpf-100", "max-lines-per-function", 100, ["error", 100]],
  [
    "linesCode",
    "len/mlpf-code-50",
    "max-lines-per-function",
    50,
    ["error", { max: 50, skipBlankLines: true, skipComments: true }],
  ],
  ["statements", "max-statements", "max-statements", 10, "error"],
  ["statements", "len/stmts-20", "max-statements", 20, ["error", 20]],
  ["statements", "len/stmts-30", "max-statements", 30, ["error", 30]],
  ["params", "max-params", "max-params", 3, "error"],
  ["params", "len/params-4", "max-params", 4, ["error", 4]],
  ["params", "len/params-5", "max-params", 5, ["error", 5]],
  ["params", "len/params-7", "max-params", 7, ["error", 7]],
  ["tsParams", "ts/max-params", null, 3, "error"],
  ["depth", "max-depth", "max-depth", 4, "error"],
  ["callbacks", "max-nested-callbacks", "max-nested-callbacks", 10, "error"],
  ["fileLines", "max-lines", "max-lines", 300, "error"],
  ["fileLines", "len/max-lines-500", "max-lines", 500, ["error", 500]],
  ["fileLines", "len/max-lines-1000", "max-lines", 1000, ["error", 1000]],
  ["classes", "max-classes-per-file", "max-classes-per-file", 1, "error"],
  ["sonarLines", "sonarjs/max-lines-per-function", null, 200, "error"],
  ["sonarFileLines", "sonarjs/max-lines", null, 1000, "error"],
  ["switchCases", "sonarjs/max-switch-cases", null, 30, "error"],
  ["unionSize", "sonarjs/max-union-size", null, 3, "error"],
  ["sonarNesting", "sonarjs/nested-control-flow", null, 3, "error"],
  ["cognitive", "sonarjs/cognitive-complexity", null, 20, ["error", 20]],
];

// ── joining ────────────────────────────────────────────────────────────
// Per file: the census functions and fast lookups. Every join is exact (a function whose head,
// node or parameter list starts at the reported position, or whose ESLint/SonarJS report location
// matches); a report that matches no census function is counted apart, never guessed.
const indexFile = (fns) => {
  const add = (map, k, f) => {
    if (k === null || k === undefined) {
      return;
    }
    if (!map.has(k)) {
      map.set(k, []);
    }
    map.get(k).push(f);
  };
  const byStart = new Map();
  const byOwner = new Map();
  const byParams = new Map();
  const byEslintKey = new Map();
  const bySonarKey = new Map();
  for (const f of fns) {
    add(byStart, f.range[0], f);
    add(byOwner, f.ownerStart, f);
    add(byParams, f.paramsStart, f);
    add(byEslintKey, f.eslintKey, f);
    add(bySonarKey, f.sonarKey, f);
  }
  // nested arrows can share a start (`a => b => {}` doesn't, but `(a) => (b) => ...` heads differ);
  // when several match, the outermost is the one a whole-function span describes
  const pick = (xs) =>
    xs?.length
      ? [...xs].sort(
          (a, b) => b.range[1] - b.range[0] - (a.range[1] - a.range[0])
        )[0]
      : null;
  return {
    eslint(key) {
      return byEslintKey.get(key) ?? [];
    },
    // a report whose span starts at a function's head: its node start, or its method key
    head(text, offset) {
      let o = offset;
      while (o < text.length && /\s/.test(text[o])) {
        o++;
      }
      return pick(byStart.get(o)) ?? pick(byOwner.get(o));
    },
    params(offset) {
      return pick(byParams.get(offset));
    },
    sonar(key) {
      return bySonarKey.get(key) ?? [];
    },
    start(offset) {
      return pick(byStart.get(offset));
    },
    within(offset) {
      let best = null;
      for (const f of fns) {
        if (
          f.range[0] <= offset &&
          offset < f.range[1] &&
          (!best || f.range[0] >= best.range[0])
        ) {
          best = f;
        }
      }
      return best;
    },
  };
};

const countOf = (message) => {
  for (const re of [
    /too many (?:lines|statements|parameters|classes) \((\d+)\)/,
    /Too many nested callbacks \((\d+)\)/,
    /nested too deeply \((\d+)\)/,
    /has (\d+) parameters/,
    /too many lines \((\d+)\)/,
    /too many statements \((\d+)\)/,
    /found (\d+) classes/,
  ]) {
    const m = re.exec(message ?? "");
    if (m) {
      return Number(m[1]);
    }
  }
  return null;
};

const main = async () => {
  const repos = lib.selectedRepos();
  const perRepo = {};
  const messages = {};
  const keepMessage = (linter, rule, d, extra = {}) => {
    const k = `${linter} ${rule}`;
    messages[k] ??= { example: d.message, ...extra };
  };

  for (const name of repos) {
    const t0 = Date.now();
    const fns = lib.readJsonl(join(CENSUS, `${name}.functions.jsonl`));
    const files = lib.readJsonl(join(CENSUS, `${name}.files.jsonl`));
    if (fns.length === 0) {
      throw new Error(`no census rows for ${name}: run length-census.cjs`);
    }
    const repo = lib.getRepo(name);
    const byFile = new Map();
    for (const f of fns) {
      if (!byFile.has(f.file)) {
        byFile.set(f.file, []);
      }
      byFile.get(f.file).push(f);
      f.ox = {};
      f.bi = {};
      f.es = {};
    }
    const fileRows = new Map(files.map((f) => [f.file, f]));
    for (const f of files) {
      f.ox = {};
      f.bi = {};
      f.es = {};
      f.typeLevel = { biome: {}, eslint: {}, oxlint: {} };
      f.unjoined = { biome: {}, oxlint: {} };
    }
    // mirror
    const root = join(MIRROR, name);
    lib.rmSync(root, { force: true, recursive: true });
    const texts = new Map();
    for (const f of files) {
      const text = lib.readFileSync(join(repo.root, f.file), "utf8");
      texts.set(f.file, text);
      const dest = join(root, f.file);
      lib.mkdirSync(dirname(dest), { recursive: true });
      lib.writeFileSync(dest, neutralise(text));
    }
    const list = files.map((f) => f.file);
    const index = new Map();
    const indexOf = (file) => {
      if (!index.has(file)) {
        index.set(file, indexFile(byFile.get(file) ?? []));
      }
      return index.get(file);
    };
    const offsets = new Map();
    const u16 = (file) => {
      if (!offsets.has(file)) {
        offsets.set(file, lib.utf16Offset(texts.get(file)));
      }
      return offsets.get(file);
    };
    const starts = new Map();
    const startsOf = (file) => {
      if (!starts.has(file)) {
        starts.set(file, lib.sk.lineStarts(texts.get(file)));
      }
      return starts.get(file);
    };

    // ── Oxlint ──
    for (const [view, rule, threshold, setting] of OX) {
      const key = `${view}@${threshold}`;
      const config = lib.writeOxlintRules(CONFIGS, `${rule}-${threshold}`, {
        [rule]: setting,
      });
      const diags = lib.runOxlint({
        configFile: config,
        cwd: root,
        files: list,
      });
      for (const d of diags) {
        const text = texts.get(d.file);
        const fr = fileRows.get(d.file);
        if (!text || !fr) {
          throw new Error(`oxlint reported an unknown file ${d.file}`);
        }
        keepMessage("oxlint", rule, d, { help: d.help });
        const count = countOf(d.message);
        if (view === "fileLines" || view === "classes") {
          fr.ox[key] = count;
          continue;
        }
        const offset = u16(d.file)(d.offset);
        const ix = indexOf(d.file);
        let f = null;
        if (view === "params") {
          f = ix.params(offset);
          if (!f) {
            fr.typeLevel.oxlint[key] = (fr.typeLevel.oxlint[key] ?? 0) + 1;
            continue;
          }
        } else if (view === "depth") {
          f = ix.within(offset);
          if (!f) {
            fr.ox[key] = Math.max(fr.ox[key] ?? 0, count); // top level
            continue;
          }
          f.ox[key] = Math.max(f.ox[key] ?? 0, count);
          f.ox[`${key}:reports`] = (f.ox[`${key}:reports`] ?? 0) + 1;
          continue;
        } else {
          // Oxlint's span is the function node's: exactly a census function's start. A report
          // that starts nowhere else is on a bodiless signature (a declared class's method, an
          // abstract method), which Oxlint measures as a one-line function and ESLint skips.
          f = ix.start(offset);
          if (!f) {
            fr.unjoined.oxlint[key] = (fr.unjoined.oxlint[key] ?? 0) + 1;
            continue;
          }
        }
        f.ox[key] = count;
      }
    }

    // ── Biome ──
    const biomeParse = {};
    for (const [view, rule, threshold, rules] of BI) {
      const key = `${view}@${threshold}`;
      const dir = lib.biomeRulesConfig(
        join(CONFIGS, `biome-${rule.replace("/", "-")}-${threshold}`),
        rules
      );
      const diags = lib.runBiome({ configDir: dir, cwd: root, files: list });
      for (const d of diags) {
        if (d.rule !== rule) {
          if (/^parse|internalError/.test(d.rule) || d.rule === "") {
            biomeParse[d.file] = d.message ?? d.rule;
          }
          continue;
        }
        const text = texts.get(d.file);
        const fr = fileRows.get(d.file);
        keepMessage("biome", rule, d);
        const count = countOf(d.message);
        if (view === "fileLines" || view === "classes") {
          fr.bi[key] = count;
          continue;
        }
        const offset = lib.codePointColumn(text, startsOf(d.file))(
          d.line,
          d.column
        );
        const ix = indexOf(d.file);
        const f = view === "params" ? ix.params(offset) : ix.head(text, offset);
        if (!f) {
          if (view === "params") {
            fr.typeLevel.biome[key] = (fr.typeLevel.biome[key] ?? 0) + 1;
          } else {
            fr.unjoined.biome[key] = (fr.unjoined.biome[key] ?? 0) + 1;
          }
          continue;
        }
        f.bi[key] = view === "callbacks" ? true : count;
      }
    }

    // ── ESLint (real rules at defaults and settings) ──
    const { Linter } = require(require.resolve("eslint", { paths: [lib.CLI] }));
    const { builtinRules } = require(
      require.resolve("eslint/use-at-your-own-risk", { paths: [lib.CLI] })
    );
    const tsPlugin = require(
      require.resolve("@typescript-eslint/eslint-plugin", { paths: [lib.CLI] })
    );
    const sonarjs = require(
      require.resolve("eslint-plugin-sonarjs", { paths: [lib.CLI] })
    );
    const linter = new Linter({ configType: "flat" });
    const lenRules = {};
    const rules = {};
    for (const [, alias, base, , options] of ES) {
      if (alias.startsWith("len/")) {
        lenRules[alias.slice(4)] = builtinRules.get(base);
      }
      rules[alias] = options;
    }
    for (const fr of files) {
      const text = texts.get(fr.file);
      const jsx = /\.(?:tsx|jsx|js|mjs|cjs)$/.test(fr.file);
      const verify = (withJsx) =>
        linter.verify(
          text,
          [
            {
              files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
              languageOptions: {
                ecmaVersion: "latest",
                parser: lib.tsParser,
                parserOptions: { ecmaFeatures: { jsx: withJsx } },
                sourceType: "module",
              },
              linterOptions: {
                noInlineConfig: true,
                reportUnusedDisableDirectives: "off",
              },
              plugins: { len: { rules: lenRules }, sonarjs, ts: tsPlugin },
              rules,
            },
          ],
          { filename: fr.file }
        );
      let msgs = verify(jsx);
      if (msgs.some((m) => m.fatal) && /\.(?:js|mjs|cjs)$/.test(fr.file)) {
        msgs = verify(false);
      }
      const ix = indexOf(fr.file);
      const st = startsOf(fr.file);
      for (const m of msgs) {
        if (!m.ruleId) {
          continue;
        }
        const spec = ES.find((e) => e[1] === m.ruleId);
        if (!spec) {
          continue;
        }
        const [view, alias, , threshold] = spec;
        const key = `${view}@${threshold}`;
        keepMessage("eslint", alias.startsWith("len/") ? spec[2] : alias, m);
        if (["fileLines", "classes", "sonarFileLines"].includes(view)) {
          fr.es[key] =
            countOf(m.message) ??
            Number(/has (\d+) lines/.exec(m.message)?.[1]);
          continue;
        }
        if (["switchCases", "unionSize", "sonarNesting"].includes(view)) {
          fr.es[key] = (fr.es[key] ?? 0) + 1;
          continue;
        }
        const offset = st[m.line - 1] + (m.column - 1);
        if (view === "depth") {
          const f = ix.within(offset);
          if (f) {
            f.es[key] = (f.es[key] ?? 0) + 1;
          } else {
            fr.es[key] = (fr.es[key] ?? 0) + 1;
          }
          continue;
        }
        // function-level: ESLint's core rules report at the function's head location
        // (getFunctionHeadLoc), SonarJS's at its main token; the census keeps both keys
        const mk = `${m.line}:${m.column}:${m.endLine}:${m.endColumn}`;
        const cands =
          view === "sonarLines" || view === "cognitive"
            ? ix.sonar(mk)
            : ix.eslint(mk);
        const best = cands.find((x) => !x.es[key]) ?? null;
        if (!best) {
          // max-params also checks function types and declared functions
          if (view === "params" || view === "tsParams") {
            fr.typeLevel.eslint[key] = (fr.typeLevel.eslint[key] ?? 0) + 1;
          } else {
            fr.unjoined.eslint ??= {};
            fr.unjoined.eslint[key] = (fr.unjoined.eslint[key] ?? 0) + 1;
          }
          continue;
        }
        best.es[key] = true;
      }
    }

    // checks: the ESLint flags equal the census counts over each threshold
    const esChecks = {};
    const censusField = {
      callbacks: "callbackDepth",
      cognitive: "cognitive",
      depth: "maxDepth",
      lines: "lines",
      linesCode: "linesCode",
      params: "paramsEslint",
      sonarLines: "sonarLines",
      statements: "statements",
      tsParams: "paramsEslint",
    };
    for (const [view, , , threshold] of ES) {
      const field = censusField[view];
      if (!field) {
        continue;
      }
      const key = `${view}@${threshold}`;
      let mismatch = 0;
      for (const f of fns) {
        let expected = (f[field] ?? 0) > threshold;
        if (view === "lines" || view === "linesCode") {
          expected &&= !f.iife;
        }
        if (view === "sonarLines") {
          expected &&= !f.iifeSonar && !f.sonarReactExempt;
        }
        const got =
          view === "depth" ? (f.es[key] ?? 0) > 0 : Boolean(f.es[key]);
        if (expected !== got) {
          mismatch++;
        }
      }
      esChecks[key] = mismatch;
    }
    const fileChecks = {};
    for (const [view, field, threshold] of [
      ["fileLines", "lines", 300],
      ["fileLines", "lines", 500],
      ["fileLines", "lines", 1000],
      ["classes", "classes", 1],
      ["sonarFileLines", "sonarLines", 1000],
    ]) {
      const key = `${view}@${threshold}`;
      fileChecks[key] = files.filter(
        (fr) => fr[field] > threshold !== (fr.es[key] !== undefined)
      ).length;
    }

    lib.writeJsonl(
      join(lib.OUT_DIR, "lint", `${name}.jsonl`),
      fns.map((f) => ({ bi: f.bi, es: f.es, id: f.id, ox: f.ox }))
    );
    lib.writeJsonl(
      join(lib.OUT_DIR, "lint", `${name}.files.jsonl`),
      files.map((f) => ({
        bi: f.bi,
        es: f.es,
        file: f.file,
        ox: f.ox,
        test: f.test,
        typeLevel: f.typeLevel,
        unjoined: f.unjoined,
      }))
    );
    perRepo[name] = {
      biomeParseErrors: Object.keys(biomeParse).length,
      biomeParseErrorFiles: Object.entries(biomeParse).slice(0, 20),
      eslintChecks: esChecks,
      eslintFileChecks: fileChecks,
      seconds: Math.round((Date.now() - t0) / 100) / 10,
    };
    console.log(
      `${name}: ${files.length} files, ${fns.length} functions, ${perRepo[name].seconds}s, eslint checks ${JSON.stringify(esChecks)} ${JSON.stringify(fileChecks)}, biome parse errors ${perRepo[name].biomeParseErrors}`
    );
  }
  lib.writeJson(join(lib.OUT_DIR, "lint", "runs.json"), {
    biome: BI.map(([v, r, t]) => [v, r, t]),
    defaults: DEFAULTS,
    eslint: ES.map(([v, a, b, t, o]) => [v, a, b, t, o]),
    messages,
    oxlint: OX.map(([v, r, t, s]) => [v, r, t, s]),
    perRepo,
    tools: lib.toolVersions(),
  });
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
