// The calibration: hand-written cases (calibration/length-limits/) through every linter's length
// rules, each at its lowest threshold (so every function reports its count) and at its default,
// plus the printWidth case through Oxfmt at 80, 100 and 120.
//
//   ESLint     the census pass (length-lib.cjs `measure`: the real rules at threshold 0, checked
//              against the census's own counts), and the rules at their defaults; also
//              max-lines-per-function with IIFEs, skipBlankLines and skipComments, max-params with
//              countThis never, and @typescript-eslint/max-params
//   SonarJS    max-lines-per-function, max-lines, max-switch-cases, max-union-size,
//              nested-control-flow (through the same ESLint pass)
//   Oxlint     each rule alone at 0 and at its default, and max-lines-per-function's options
//   Biome      noExcessiveLinesPerFunction (maxLines 1, and skipBlankLines / skipIifes),
//              useMaxParams (0), noExcessiveStatementsPerFunction (0), noExcessiveNestedCallbacks
//              (0 to 6), noExcessiveLinesPerFile (1), noExcessiveClassesPerFile (1), each alone;
//              and each at its default
//
// Every diagnostic is joined to the function it is about (or the file), and each function to its
// case by the top-level declaration that contains it.
//
// Usage: node research/corpus/scripts/length-calibration.cjs
// Writes results/length-limits/calibration.json.
"use strict";

const { copyFileSync, readdirSync } = require("node:fs");
const { basename, join } = require("node:path");

const lib = require("./length-lib.cjs");
const { formatCopies } = require("./length-format-lib.cjs");

const DIR = lib.CALIBRATION_DIR;
const WORK = join(lib.TMP, "calibration");

const CASES = {
  D01: "a declared function with five parameters (.d.ts)",
  D02: "overloads, one with five parameters (.d.ts)",
  D03: "a declared class: constructor and method with five parameters (.d.ts)",
  D04: "a function type alias with five parameters (.d.ts)",
  F01: "four classes: export default, declaration, expression, abstract",
  J01: "a function component that returns JSX",
  J02: "an arrow component with an expression body",
  J03: "a component wrapped in forwardRef",
  J04: "a lowercase helper returning JSX with a map callback",
  J05: "a component whose markup is most of its 60 lines",
  L01: "five physical lines, three statements",
  L02: "blank lines, line, block and JSDoc comments in the body",
  L03: "a function nested inside another",
  L04: "closing braces and `} else {` on their own lines",
  L05: "an IIFE (function expression)",
  L06: "an IIFE (arrow)",
  L07: "an IIFE called with .call(), and one behind a TypeScript cast",
  L08: "an arrow with a multi-line expression body",
  L09: "class: parameter-property constructor, decorated method, multi-line signature, getter, setter, static block",
  L10: "object methods, getter, setter and an arrow property",
  L11: "overloads and the implementation",
  L12: "default, rest and destructured parameters",
  L13: "a typed `this` parameter and three more",
  L14: "a `this: void` parameter and three more",
  L15: "four parameters in a function type, method signature, call and construct signatures",
  L16: "a function type alias with four parameters",
  L17: "a switch with statements in its cases and a case block",
  L18: "depth: try, if, for-of, switch, while; else-if chains; catch and finally",
  L19: "depth: an if as the brace-less consequent of another if",
  L20: "depth: bare blocks and a labelled loop",
  L21: "nesting across a callback (S134 carries it, max-depth resets)",
  L22: "callbacks: plain, function expression, new Promise, an IIFE inside, a cast",
  L23: "callbacks nested six deep",
  L24: "statements: a directive, a nested block, an expression-bodied arrow",
  L25: "a long object literal",
  L26: "a long template literal",
  L27: "unions: in a type alias, in a parameter, in a utility type",
  L28: "a setter (one parameter)",
  L29: "a constructor with five parameters",
  L30: "an async generator method and an abstract method",
  L31: "one long call over many lines",
  P01: "a function whose length depends on printWidth",
};

// The case a line belongs to: the nearest `// <ID>:` marker above it.
const caseRanges = (text) => {
  const lines = text.split("\n");
  const out = [];
  lines.forEach((l, i) => {
    const m = /^\/\/ ([A-Z]\d\d):/.exec(l);
    if (m) {
      out.push({ id: m[1], start: i + 1 });
    }
  });
  out.forEach((c, i) => {
    c.end = i + 1 < out.length ? out[i + 1].start - 1 : lines.length;
  });
  return out;
};

const ESLINT_DEFAULT_RULES = {
  "max-classes-per-file": "error",
  "max-depth": "error",
  "max-lines": "error",
  "max-lines-per-function": "error",
  "max-nested-callbacks": "error",
  "max-params": "error",
  "max-statements": "error",
  "sonarjs/cognitive-complexity": ["error", 20],
  "sonarjs/max-lines": "error",
  "sonarjs/max-lines-per-function": "error",
  "sonarjs/max-switch-cases": "error",
  "sonarjs/max-union-size": "error",
  "sonarjs/nested-control-flow": "error",
  "ts/max-params": "error",
};
const OXLINT_ZERO = {
  "max-classes-per-file": ["error", 0],
  "max-depth": ["error", 0],
  "max-lines": ["error", { max: 0 }],
  "max-lines-per-function": ["error", { max: 0 }],
  "max-nested-callbacks": ["error", 0],
  "max-params": ["error", 0],
  "max-statements": ["error", 0],
};
const OXLINT_VARIANTS = {
  "mlpf-code": {
    "max-lines-per-function": [
      "error",
      { max: 0, skipBlankLines: true, skipComments: true },
    ],
  },
  "mlpf-iife": { "max-lines-per-function": ["error", { IIFEs: true, max: 0 }] },
  "params-always": { "max-params": ["error", { countThis: "always", max: 0 }] },
  "params-never": { "max-params": ["error", { countThis: "never", max: 0 }] },
};
const OXLINT_DEFAULTS = Object.fromEntries(
  Object.keys(OXLINT_ZERO).map((r) => [r, "error"])
);
const BIOME_MIN = {
  complexity: {
    noExcessiveLinesPerFunction: { level: "error", options: { maxLines: 1 } },
    useMaxParams: { level: "error", options: { max: 0 } },
  },
  nursery: {
    noExcessiveStatementsPerFunction: {
      level: "error",
      options: { max: 0 },
    },
  },
  style: {
    noExcessiveClassesPerFile: { level: "error", options: { maxClasses: 1 } },
    noExcessiveLinesPerFile: { level: "error", options: { maxLines: 1 } },
  },
};
const BIOME_VARIANTS = {
  "lines-noblank": {
    complexity: {
      noExcessiveLinesPerFunction: {
        level: "error",
        options: { maxLines: 1, skipBlankLines: true },
      },
    },
  },
  "lines-skip-iifes": {
    complexity: {
      noExcessiveLinesPerFunction: {
        level: "error",
        options: { maxLines: 1, skipIifes: true },
      },
    },
  },
};
const BIOME_DEFAULTS = {
  complexity: {
    noExcessiveLinesPerFunction: "error",
    noExcessiveNestedCallbacks: "error",
    useMaxParams: "error",
  },
  nursery: { noExcessiveStatementsPerFunction: "error" },
  style: {
    noExcessiveClassesPerFile: "error",
    noExcessiveLinesPerFile: "error",
  },
};

const COUNT = [
  /\((\d+)\)/,
  /has (\d+) parameters/,
  /found (\d+) classes/,
  /Callbacks nested (\d+) levels/,
];
const countOf = (message) => {
  for (const re of COUNT) {
    const m = re.exec(message ?? "");
    if (m) {
      return Number(m[1]);
    }
  }
  return null;
};

const main = async () => {
  lib.rmSync(WORK, { force: true, recursive: true });
  lib.mkdirSync(WORK, { recursive: true });
  const files = readdirSync(DIR).filter((f) => /\.(?:ts|tsx)$/.test(f));
  for (const f of files) {
    copyFileSync(join(DIR, f), join(WORK, f));
  }
  const perFile = {};
  for (const f of files) {
    const text = lib.readFileSync(join(WORK, f), "utf8");
    const m = lib.measure(text, f);
    if (m.error) {
      throw new Error(`${f}: ${m.error}`);
    }
    perFile[f] = {
      cases: caseRanges(text),
      fileRow: m.file,
      fns: m.functions,
      measured: m,
      text,
    };
  }
  const caseOf = (file, line) =>
    perFile[file].cases.find((c) => line >= c.start && line <= c.end)?.id ??
    null;

  // views: [{ view, rule, file, fnIndex | null, count, message, help }]
  const hits = [];
  const fnOfOffset = (file, offset, head) =>
    head
      ? lib.functionAtHead(perFile[file].fns, perFile[file].text, offset)
      : lib.innermostFunction(perFile[file].fns, offset);

  // ESLint at threshold 0 (the census pass)
  for (const [file, p] of Object.entries(perFile)) {
    for (const f of p.fns) {
      for (const [rule, count] of Object.entries(f.eslint)) {
        hits.push({ count, file, fn: f.index, rule, view: "eslint@0" });
      }
      hits.push({
        count: f.cognitive,
        file,
        fn: f.index,
        rule: "sonarjs/cognitive-complexity",
        view: "eslint@0",
      });
    }
    for (const [rule, count] of Object.entries(p.fileRow.eslint)) {
      hits.push({ count, file, fn: null, rule, view: "eslint@0" });
    }
    for (const s of p.measured.signatures) {
      for (const [rule, count] of Object.entries(s.eslint ?? {})) {
        hits.push({
          count,
          file,
          fn: null,
          line: s.line,
          rule,
          signature: s.type,
          view: "eslint@0",
        });
      }
    }
  }

  // ESLint at defaults (real messages)
  const { Linter } = require(require.resolve("eslint", { paths: [lib.CLI] }));
  const linter = new Linter({ configType: "flat" });
  const tsPlugin = require(
    require.resolve("@typescript-eslint/eslint-plugin", { paths: [lib.CLI] })
  );
  const sonarjs = require(
    require.resolve("eslint-plugin-sonarjs", { paths: [lib.CLI] })
  );
  const eslintMessages = {};
  for (const [file, p] of Object.entries(perFile)) {
    const msgs = linter.verify(
      p.text,
      [
        {
          files: ["**/*.{ts,tsx}"],
          languageOptions: {
            parser: lib.tsParser,
            parserOptions: { ecmaFeatures: { jsx: file.endsWith(".tsx") } },
          },
          linterOptions: { reportUnusedDisableDirectives: "off" },
          plugins: { sonarjs, ts: tsPlugin },
          rules: ESLINT_DEFAULT_RULES,
        },
      ],
      { filename: file }
    );
    for (const m of msgs) {
      const starts = lib.sk.lineStarts(p.text);
      const offset = starts[m.line - 1] + (m.column - 1);
      const fn = /max-lines$|max-classes|union|switch|nested-control/.test(
        m.ruleId
      )
        ? null
        : fnOfOffset(file, offset, true);
      hits.push({
        case: caseOf(file, m.line),
        count: countOf(m.message),
        file,
        fn: fn?.index ?? null,
        line: m.line,
        message: m.message,
        rule: m.ruleId,
        view: "eslint@default",
      });
      eslintMessages[m.ruleId] ??= m.message;
    }
  }

  // Oxlint
  const oxDir = join(lib.TMP, "configs", "calibration");
  const oxRun = (view, rules) => {
    const config = lib.writeOxlintRules(oxDir, view, rules);
    for (const d of lib.runOxlint({ configFile: config, cwd: WORK, files })) {
      const p = perFile[d.file];
      const toU = lib.utf16Offset(p.text);
      const offset = toU(d.offset);
      const fileLevel = /max-lines$|max-classes/.test(d.rule);
      const fn = fileLevel
        ? null
        : d.rule === "max-depth"
          ? lib.innermostFunction(p.fns, offset)
          : d.rule === "max-params"
            ? lib.innermostFunction(p.fns, offset)
            : fnOfOffset(d.file, offset, true);
      hits.push({
        count: countOf(d.message),
        file: d.file,
        fn: fn?.index ?? null,
        help: d.help,
        line: d.line,
        message: d.message,
        rule: d.rule,
        view,
      });
    }
  };
  oxRun("oxlint@0", OXLINT_ZERO);
  for (const [name, rules] of Object.entries(OXLINT_VARIANTS)) {
    oxRun(`oxlint:${name}@0`, rules);
  }
  oxRun("oxlint@default", OXLINT_DEFAULTS);

  // Biome
  const biomeRun = (view, rules) => {
    const dir = lib.biomeRulesConfig(
      join(lib.TMP, "configs", `biome-${view}`),
      rules
    );
    const notes = lib.biomeNotes({ configDir: dir, cwd: WORK, files });
    for (const d of lib.runBiome({ configDir: dir, cwd: WORK, files })) {
      const p = perFile[d.file];
      const starts = lib.sk.lineStarts(p.text);
      const offset = lib.codePointColumn(p.text, starts)(d.line, d.column);
      const fileLevel = /PerFile$/.test(d.rule);
      const fn = fileLevel
        ? null
        : /useMaxParams/.test(d.rule)
          ? lib.innermostFunction(p.fns, offset)
          : fnOfOffset(d.file, offset, true);
      const note = notes.find(
        (n) =>
          n.file === d.file &&
          n.line === d.line &&
          d.rule.endsWith(n.rule.split("/").at(-1))
      );
      hits.push({
        count:
          countOf(d.message) ?? countOf((note?.notes ?? []).join(" ")) ?? null,
        file: d.file,
        fn: fn?.index ?? null,
        line: d.line,
        message: d.message,
        notes: note?.notes ?? [],
        rule: d.rule,
        signature:
          !fn && !fileLevel && /useMaxParams/.test(d.rule)
            ? "type-level"
            : undefined,
        view,
      });
    }
  };
  biomeRun("biome@min", BIOME_MIN);
  for (const [name, rules] of Object.entries(BIOME_VARIANTS)) {
    biomeRun(`biome:${name}@min`, rules);
  }
  for (let max = 0; max <= 6; max++) {
    biomeRun(`biome:callbacks@${max}`, {
      complexity: {
        noExcessiveNestedCallbacks: { level: "error", options: { max } },
      },
    });
  }
  biomeRun("biome@default", BIOME_DEFAULTS);

  // Assemble per case and function
  const cases = {};
  for (const [file, p] of Object.entries(perFile)) {
    for (const c of p.cases) {
      cases[c.id] = {
        description: CASES[c.id] ?? null,
        file,
        functions: [],
        lines: [c.start, c.end],
        typeLevel: [],
        fileLevel: {},
      };
    }
    for (const f of p.fns) {
      const id = caseOf(file, f.startLine);
      if (!id) {
        continue;
      }
      const row = {
        census: {
          biomeLines: f.biomeLines,
          callbackDepth: f.callbackDepth,
          iife: f.iife,
          iifeLoose: f.iifeLoose,
          lines: f.lines,
          linesCode: f.linesCode,
          linesFn: f.linesFn,
          maxDepth: f.maxDepth,
          params: f.params,
          paramsEslint: f.paramsEslint,
          sonarLines: f.sonarLines,
          sonarNestMax: f.sonarNestMax,
          statements: f.statements,
        },
        kind: f.kind,
        line: f.startLine,
        name: f.name,
        views: {},
      };
      for (const h of hits.filter((x) => x.file === file && x.fn === f.index)) {
        row.views[h.view] ??= {};
        const prev = row.views[h.view][h.rule];
        // max-depth reports each block: keep the deepest
        row.views[h.view][h.rule] =
          prev === undefined ? h.count : Math.max(prev, h.count ?? 0);
      }
      cases[id].functions.push(row);
    }
    for (const h of hits.filter((x) => x.file === file && x.fn === null)) {
      if (h.signature || (h.line && /params/i.test(h.rule))) {
        const id = caseOf(file, h.line);
        if (id) {
          cases[id].typeLevel.push({
            count: h.count,
            line: h.line,
            rule: h.rule,
            signature: h.signature ?? null,
            view: h.view,
          });
        }
        continue;
      }
      // file-level rules: attach to every case in the file
      for (const c of p.cases) {
        cases[c.id].fileLevel[`${h.view} ${h.rule}`] = h.count;
      }
    }
  }

  // The printWidth case: P01 formatted at 80, 100 and 120, recounted.
  const formatted = {};
  for (const width of [80, 100, 120]) {
    const out = formatCopies({
      files: ["printwidth.ts"],
      label: `calibration-${width}`,
      printWidth: width,
      root: DIR,
    });
    const text = lib.readFileSync(join(out.dir, "printwidth.ts"), "utf8");
    const m = lib.measure(text, "printwidth.ts");
    const f = m.functions.find((x) => x.name === "P01");
    formatted[width] = {
      biomeLines: f.biomeLines,
      lines: f.lines,
      linesCode: f.linesCode,
      params: f.params,
      sonarLines: f.sonarLines,
      statements: f.statements,
    };
  }

  // Messages and help, by linter and rule (what an agent is handed)
  const messages = {};
  for (const h of hits) {
    if (!h.message || !/@default$|@0$|@min$/.test(h.view)) {
      continue;
    }
    const linter = h.view.split(/[@:]/)[0];
    messages[`${linter} ${h.rule}`] ??= {
      example: h.message,
      help: h.help ?? null,
      notes: h.notes ?? null,
    };
  }

  lib.writeJson(join(lib.RESULTS_DIR, "calibration.json"), {
    cases,
    files,
    generated: new Date().toISOString(),
    messages,
    note: "Each linter's count for every calibration function: `eslint@0` is the census pass (the real ESLint and SonarJS rules at threshold 0), `oxlint@0` and `biome@min` each rule alone at its lowest threshold, the `:variant` views an option, `biome:callbacks@N` noExcessiveNestedCallbacks at max N (Biome reports only the outermost callback over the limit), and `@default` each rule at its own default. A rule missing from a function's view didn't report it. `typeLevel` holds max-params reports on signatures that aren't functions; `fileLevel` holds the per-file rules. `printWidth` is P01 after Oxfmt with Ultracite's config at each width.",
    printWidth: formatted,
    tools: lib.toolVersions(),
  });
  console.log(
    `calibration: ${Object.keys(cases).length} cases, ${hits.length} hits`
  );
  void basename;
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
