// What the rules report: each rule alone in Oxlint and Biome (and the ESLint reports from the
// census pass), on two mirrors of every repo's files, one with every disable directive neutralised
// (raw: `eslint-`/`oxlint-disable`/`-enable` and `biome-ignore`, rewritten to the same length) and
// one as written (reported). Only files are copied, so no config from a clone is read. Every
// diagnostic is joined to the inventory: func-style to its function, no-use-before-define to its
// use-before-define candidate (func-style-lib.cjs), the others to the innermost function. Every
// item the implementations disagree on gets a reason from the inventory's facts.
//
// Usage: node --max-old-space-size=12288 research/corpus/scripts/func-style-linters.cjs [--repos a,b]
// Writes out/func-style/linters/<repo>.jsonl and results/func-style/linters.json.
"use strict";

const {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join } = require("node:path");

const lib = require("./func-style-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const OUT = join(lib.OUT_DIR, "linters");
const MIRROR = join(lib.TMP, "mirror");
const CONFIGS = join(lib.TMP, "configs");

// ── views ──────────────────────────────────────────────────────────────
const OXLINT_PASSES = {
  a: {
    "arrow-body-style": ["error", "as-needed"],
    "func-names": "error",
    "func-style": ["error", "expression", { allowArrowFunctions: true }],
    "no-use-before-define": "error",
    "prefer-arrow-callback": "error",
    "unicorn/consistent-function-scoping": "error",
  },
  b: {
    "func-style": ["error", "declaration"],
    "no-use-before-define": ["error", "nofunc"],
  },
  c: {
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "no-use-before-define": [
      "error",
      {
        classes: false,
        enums: false,
        functions: false,
        typedefs: false,
        variables: false,
      },
    ],
  },
};
// view name for (pass, rule)
const OXLINT_VIEW = {
  "a:arrow-body-style": "oxlint/arrow-body-style",
  "a:func-names": "oxlint/func-names",
  "a:func-style": "oxlint/func-style",
  "a:no-use-before-define": "oxlint/no-use-before-define",
  "a:prefer-arrow-callback": "oxlint/prefer-arrow-callback",
  "a:unicorn/consistent-function-scoping":
    "oxlint/unicorn/consistent-function-scoping",
  "b:func-style": "oxlint/func-style:declaration",
  "b:no-use-before-define": "oxlint/no-use-before-define:nofunc",
  "c:func-style": "oxlint/func-style:declaration+arrows",
  "c:no-use-before-define": "oxlint/no-use-before-define:same-context",
};
const BIOME_PASSES = {
  a: {
    complexity: { useArrowFunction: "error" },
    correctness: { noInvalidUseBeforeDeclaration: "error" },
    nursery: {
      useConsistentFunctionStyle: {
        level: "error",
        options: { style: "expression" },
      },
      useNamedFunction: "error",
    },
    style: { useConsistentArrowReturn: "error" },
  },
  b: {
    nursery: {
      useConsistentFunctionStyle: {
        level: "error",
        options: { style: "declaration" },
      },
    },
  },
  c: {
    nursery: {
      useConsistentFunctionStyle: {
        level: "error",
        options: { allowArrowFunctions: true, style: "declaration" },
      },
    },
  },
};
const BIOME_VIEW = {
  "a:complexity/useArrowFunction": "biome/useArrowFunction",
  "a:correctness/noInvalidUseBeforeDeclaration":
    "biome/noInvalidUseBeforeDeclaration",
  "a:nursery/useConsistentFunctionStyle": "biome/useConsistentFunctionStyle",
  "a:nursery/useNamedFunction": "biome/useNamedFunction",
  "a:style/useConsistentArrowReturn": "biome/useConsistentArrowReturn",
  "b:nursery/useConsistentFunctionStyle":
    "biome/useConsistentFunctionStyle:declaration",
  "c:nursery/useConsistentFunctionStyle":
    "biome/useConsistentFunctionStyle:declaration+arrows",
};
const ESLINT_VIEW = {
  "arrow-body-style": "eslint/arrow-body-style",
  "fs/func-style-declaration": "eslint/func-style:declaration",
  "fs/func-style-declaration-arrows": "eslint/func-style:declaration+arrows",
  "fs/ubd-nofunc": "eslint/no-use-before-define:nofunc",
  "fs/ubd-tdz-only": "eslint/no-use-before-define:same-context",
  "fs/ubd-ts-nofunc": "eslint/ts/no-use-before-define:nofunc",
  "fs/ubd-ts-tdz-only": "eslint/ts/no-use-before-define:same-context",
  "func-names": "eslint/func-names",
  "func-style": "eslint/func-style",
  "no-use-before-define": "eslint/no-use-before-define",
  "prefer-arrow-callback": "eslint/prefer-arrow-callback",
  "ts/no-use-before-define": "eslint/ts/no-use-before-define",
};
const FAMILY = (view) =>
  /func-style:declaration|useConsistentFunctionStyle:declaration/.test(view)
    ? "func-style-declaration"
    : /func-style|useConsistentFunctionStyle/.test(view)
      ? "func-style"
      : /use-before-define|UseBeforeDeclaration/.test(view)
        ? "ubd"
        : "function";

// ── mirrors ────────────────────────────────────────────────────────────
const DIRECTIVES = /\b(?:eslint|oxlint)-(?:disable|enable)|biome-ignore/g;
const neutralise = (text) =>
  text.replace(
    DIRECTIVES,
    (m) => "x".repeat(m.indexOf("-")) + m.slice(m.indexOf("-"))
  );
const writeMirrors = (name, files) => {
  const root = lib.getRepo(name).root;
  let neutralised = 0;
  for (const mode of ["raw", "reported"]) {
    rmSync(join(MIRROR, mode, name), { force: true, recursive: true });
  }
  for (const { rel } of files) {
    const text = readFileSync(join(root, rel), "utf8");
    for (const mode of ["raw", "reported"]) {
      const dest = join(MIRROR, mode, name, rel);
      mkdirSync(dirname(dest), { recursive: true });
      if (mode === "raw") {
        const n = text.match(DIRECTIVES)?.length ?? 0;
        neutralised += n;
        writeFileSync(dest, n ? neutralise(text) : text);
      } else {
        copyFileSync(join(root, rel), dest);
      }
    }
  }
  return neutralised;
};

// ── offsets ────────────────────────────────────────────────────────────
const lineStarts = (text) => {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      starts.push(i + 1);
    }
  }
  return starts;
};
const lineColOf = (starts, off) => {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= off) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return { column: off - starts[lo], line: lo + 1 };
};

// ── runs ───────────────────────────────────────────────────────────────
const runOxlintViews = (name, files) => {
  const out = [];
  for (const [pass, rules] of Object.entries(OXLINT_PASSES)) {
    const cfg = lib.writeOxlintRules(CONFIGS, `pass-${pass}`, rules, {
      plugins: ["eslint", "unicorn"],
    });
    for (const mode of ["raw", "reported"]) {
      const diags = lib.runOxlint({
        configFile: cfg,
        cwd: join(MIRROR, mode, name),
        files: files.map((f) => f.rel),
      });
      for (const d of diags) {
        const view = OXLINT_VIEW[`${pass}:${d.rule}`];
        if (!view) {
          throw new Error(`unexpected oxlint rule ${d.rule}`);
        }
        out.push({ ...d, mode, view });
      }
    }
  }
  return out;
};
const runBiomeViews = (name, files) => {
  const out = [];
  for (const [pass, rules] of Object.entries(BIOME_PASSES)) {
    const dir = join(CONFIGS, `biome-${pass}`);
    lib.biomeRulesConfig(dir, rules);
    for (const mode of ["raw", "reported"]) {
      const diags = lib.runBiome({
        configDir: dir,
        cwd: join(MIRROR, mode, name),
        files: files.map((f) => f.rel),
      });
      for (const d of diags) {
        if (!d.rule || d.rule === "parse" || !d.rule.includes("/")) {
          out.push({ ...d, mode, view: "biome/parse" });
          continue;
        }
        const view = BIOME_VIEW[`${pass}:${d.rule}`];
        if (!view) {
          out.push({ ...d, mode, view: `biome/other:${d.rule}` });
          continue;
        }
        out.push({ ...d, mode, view });
      }
    }
  }
  return out;
};

// ── joins ──────────────────────────────────────────────────────────────
const joinRepo = (name, files, diags) => {
  const fns = lib.readJsonl(join(CENSUS, `${name}.functions.jsonl`));
  const ubd = lib.readJsonl(join(CENSUS, `${name}.ubd.jsonl`));
  const eslint = lib.readJsonl(join(CENSUS, `${name}.eslint.jsonl`));
  const fnsByFile = new Map();
  for (const f of fns) {
    fnsByFile.set(f.file, [...(fnsByFile.get(f.file) ?? []), f]);
  }
  const ubdByKey = new Map(
    ubd.map((u) => [`${u.file}:${u.line}:${u.column}`, u])
  );
  const root = join(MIRROR, "raw", name);
  const texts = new Map();
  const textOf = (rel) => {
    if (!texts.has(rel)) {
      const text = readFileSync(join(root, rel), "utf8");
      texts.set(rel, {
        cp: null,
        starts: lineStarts(text),
        text,
        u16: lib.utf16Offset(text),
      });
    }
    return texts.get(rel);
  };
  const testOf = new Map(files.map((f) => [f.rel, f.test]));
  const rows = [];
  const fnKey = (f) => `${f.file}#${f.i}`;
  const innermost = (list, off, pred = () => true) => {
    let best = null;
    for (const f of list) {
      if (f.start <= off && off < f.end && pred(f)) {
        if (!best || f.start >= best.start) {
          best = f;
        }
      }
    }
    return best;
  };
  const attach = (row, rel, off) => {
    const list = fnsByFile.get(rel) ?? [];
    const fam = FAMILY(row.view);
    const t = textOf(rel);
    const { line, column } = lineColOf(t.starts, off);
    row.line = line;
    row.column = column;
    if (fam === "ubd") {
      const u = ubdByKey.get(`${rel}:${line}:${column}`);
      row.item = u ? `${rel}:${line}:${column}` : null;
      return;
    }
    if (fam === "func-style") {
      const f =
        list.find((x) => x.type === "FunctionDeclaration" && x.start === off) ??
        innermost(list, off, (x) => x.type === "FunctionDeclaration") ??
        list.find((x) => x.stmtStart === off);
      row.item = f ? fnKey(f) : null;
      return;
    }
    if (fam === "func-style-declaration") {
      const f =
        list.find(
          (x) =>
            lib.isVarBound(x.form) &&
            x.declLine === line &&
            x.declColumn === column
        ) ??
        list.find((x) => x.start === off) ??
        innermost(list, off, (x) => lib.isVarBound(x.form)) ??
        list.find((x) => x.stmtStart === off);
      row.item = f ? fnKey(f) : null;
      return;
    }
    const f =
      list.find((x) => x.start === off) ??
      innermost(list, off) ??
      // reports on a method key or a declarator sit just before the function
      list.find(
        (x) =>
          x.stmtStart === off ||
          (x.declLine === line && x.declColumn === column)
      );
    row.item = f ? fnKey(f) : null;
  };
  for (const d of diags) {
    if (d.view === "biome/parse") {
      rows.push({ ...d, test: testOf.get(d.file) ?? null });
      continue;
    }
    const rel = d.file;
    const t = textOf(rel);
    let off;
    if (d.view.startsWith("oxlint/")) {
      off = t.u16(d.offset);
    } else {
      // Biome: 1-based line, code-point column
      const lineStart = t.starts[d.line - 1];
      const lineText = t.text.slice(
        lineStart,
        t.starts[d.line] ?? t.text.length
      );
      let u = 0;
      let cp = 1;
      for (const ch of lineText) {
        if (cp === d.column) {
          break;
        }
        u += ch.length;
        cp++;
      }
      off = lineStart + u;
    }
    const row = {
      file: rel,
      help: d.help ?? null,
      message: d.message,
      mode: d.mode,
      test: testOf.get(rel),
      view: d.view,
      ...(d.advices?.length
        ? {
            advices: JSON.stringify(d.advices).slice(0, 600),
          }
        : {}),
    };
    attach(row, rel, off);
    rows.push(row);
  }
  for (const m of eslint) {
    const view = ESLINT_VIEW[m.rule];
    if (!view) {
      continue;
    }
    const t = textOf(m.file);
    const off = t.starts[m.line - 1] + m.column;
    const row = {
      file: m.file,
      fix: m.fix,
      help: null,
      message: m.message,
      mode: m.mode,
      suggestions: m.suggestions,
      test: m.test,
      view,
    };
    attach(row, m.file, off);
    rows.push(row);
    // Ultracite's own ESLint no-use-before-define: the base rule on JS, typescript-eslint's on TS
    if (m.rule === lib.ultraciteUbdRule(m.file)) {
      rows.push({ ...row, view: "eslint/ultracite:no-use-before-define" });
    }
  }
  return { fns, rows, ubd };
};

// ── agreement ──────────────────────────────────────────────────────────
// For each family, the items any view flags, which views flag each, and a reason for every item
// where the Ultracite views (Oxlint, ESLint) and Biome differ.
const funcStyleReason = (f, flagged) => {
  const reasons = [];
  if (f.form === "export-default-declaration") {
    reasons.push("export default function");
  }
  if (f.overloaded) {
    reasons.push(
      f.overloadedEslint
        ? "overloads (ESLint sees them)"
        : "overloads ESLint doesn't see"
    );
  }
  if (f.sameNameType) {
    reasons.push("a type or interface with the same name");
  }
  if (f.scope !== "module") {
    reasons.push(`scope ${f.scope}`);
  }
  if (f.exported) {
    reasons.push("exported");
  }
  if (f.generator) {
    reasons.push("generator");
  }
  if (f.async) {
    reasons.push("async");
  }
  if (f.usesThis) {
    reasons.push("uses this");
  }
  if (f.component) {
    reasons.push("component");
  }
  return reasons.length ? reasons.join(", ") : `other (${flagged.join("+")})`;
};
const declarationReason = (f) => {
  const r = [];
  r.push(
    f.type === "ArrowFunctionExpression" ? "arrow" : "function expression"
  );
  if (f.usesThis || f.usesSuper) {
    r.push("arrow uses this/super");
  }
  if (f.varAnnotated) {
    r.push("variable type annotation");
  }
  if (f.satisfies || f.asserted) {
    r.push("as/satisfies wrapper");
  }
  if (f.exported) {
    r.push("exported");
  }
  if (f.scope !== "module") {
    r.push(`scope ${f.scope}`);
  }
  if (f.declKind !== "const") {
    r.push(`${f.declKind}`);
  }
  return r.join(", ");
};
const ubdReason = (u) => {
  const r = [
    u.cls,
    `${u.def0Type}${u.def0Type !== u.defType ? `→${u.defType}` : ""}`,
  ];
  if (u.deferredScopeType && u.deferredScopeType !== "function") {
    r.push(`deferred by a ${u.deferredScopeType}`);
  }
  if (u.exportSpecifier) {
    r.push("export specifier");
  }
  if (u.typeRef) {
    r.push("type reference");
  }
  if (u.sameContext) {
    r.push("same execution context");
  }
  if (u.ownInit) {
    r.push("own initializer");
  }
  if (u.classSelf) {
    r.push("inside its class");
  }
  if (!u.beforeFirstDef) {
    r.push("after the first definition");
  }
  return r.join(", ");
};

const main = () => {
  const names = lib.selectedRepos(lib.ALL);
  lib.checkPinned(names);
  const previous = lib.readJson(join(lib.RESULTS_DIR, "linters.json"), {
    repos: {},
  });
  const result = {
    generated: new Date().toISOString(),
    note: "Each rule alone (Oxlint: every category off, the rules of one pass; Biome: recommended off, the rules of one pass; ESLint: the census pass, func-style-lib.cjs ESLINT_RULES), on a mirror with disable directives neutralised (raw) and one as written (reported). eslint/ultracite:no-use-before-define is the base rule on JS files and typescript-eslint's on TS files, as Ultracite's ESLint preset configures them.",
    oxlintPasses: OXLINT_PASSES,
    biomePasses: BIOME_PASSES,
    eslintRules: lib.ESLINT_RULES,
    repos: { ...previous.repos },
    tools: lib.toolVersions(),
  };
  for (const name of names) {
    const t0 = Date.now();
    const files = lib.filesOf(name);
    const neutralised = writeMirrors(name, files);
    const ox = runOxlintViews(name, files);
    const bi = runBiomeViews(name, files);
    const { fns, rows, ubd } = joinRepo(name, files, [...ox, ...bi]);
    lib.writeJsonl(join(OUT, `${name}.jsonl`), rows);
    const entry = { neutralised, sha: lib.shaOf(name), set: lib.setOf(name) };
    for (const test of [false, true]) {
      const rs = rows.filter((r) => r.test === test);
      const counts = {};
      for (const r of rs) {
        counts[r.view] ??= { raw: 0, reported: 0, unjoined: 0 };
        counts[r.view][r.mode]++;
        if (r.mode === "raw" && r.item === null && r.view !== "biome/parse") {
          counts[r.view].unjoined++;
        }
      }
      entry[test ? "tests" : "source"] = counts;
    }
    // messages: every distinct message shape and help, per view
    const shapes = {};
    for (const r of rows) {
      const shape = (r.message ?? "")
        .replace(/'[^']*'/g, "'…'")
        .replace(/`[^`]*`/g, "`…`");
      const k = `${r.view}\u0000${shape}\u0000${r.help ?? ""}`;
      shapes[k] = (shapes[k] ?? 0) + 1;
    }
    entry.messages = Object.entries(shapes).map(([k, n]) => {
      const [view, message, help] = k.split("\u0000");
      return { help: help || null, message, n, view };
    });
    entry.seconds = Math.round((Date.now() - t0) / 1000);
    void fns;
    void ubd;
    result.repos[name] = entry;
    rmSync(join(MIRROR, "reported", name), { force: true, recursive: true });
    console.log(
      `${name}: ${Object.entries(entry.source)
        .filter(([v]) =>
          /func-style|use-before|UseBefore|FunctionStyle/.test(v)
        )
        .map(
          ([v, c]) =>
            `${v.replace(/^(oxlint|eslint|biome)\//, "$1:")} ${c.raw}/${c.reported}${c.unjoined ? ` (unjoined ${c.unjoined})` : ""}`
        )
        .join("; ")} (${entry.seconds}s)`
    );
  }
  // agreement, pooled over the measured repos (source and tests apart)
  result.agreement = {};
  for (const test of [false, true]) {
    const key = test ? "tests" : "source";
    const fam = {
      "func-style": new Map(),
      "func-style-declaration": new Map(),
      ubd: new Map(),
    };
    const itemInfo = new Map();
    for (const name of names.filter((n) => n !== "ultracite")) {
      const rows = lib
        .readJsonl(join(OUT, `${name}.jsonl`))
        .filter((r) => r.test === test && r.mode === "raw" && r.item);
      const fns = new Map(
        lib
          .readJsonl(join(CENSUS, `${name}.functions.jsonl`))
          .map((f) => [`${f.file}#${f.i}`, f])
      );
      const ubd = new Map(
        lib
          .readJsonl(join(CENSUS, `${name}.ubd.jsonl`))
          .map((u) => [`${u.file}:${u.line}:${u.column}`, u])
      );
      for (const r of rows) {
        const f = FAMILY(r.view);
        if (!fam[f]) {
          continue;
        }
        const id = `${name}|${r.item}`;
        if (!fam[f].has(id)) {
          fam[f].set(id, new Set());
        }
        fam[f].get(id).add(r.view);
        if (!itemInfo.has(id)) {
          itemInfo.set(
            id,
            f === "ubd"
              ? { kind: "ubd", ...ubd.get(r.item) }
              : { kind: "fn", ...fns.get(r.item) }
          );
        }
      }
      // items no view flags still matter for the ubd candidates (counted below)
    }
    const compare = (family, views, reasonOf) => {
      const combos = {};
      const examples = {};
      for (const [id, set] of fam[family]) {
        const flagged = views.filter((v) => set.has(v));
        if (flagged.length === 0) {
          continue;
        }
        if (flagged.length === views.length) {
          combos.all = (combos.all ?? 0) + 1;
          continue;
        }
        const label = `${flagged.map((v) => v.split("/")[0]).join("+") || "none"} only`;
        const info = itemInfo.get(id);
        const reason = reasonOf(info, flagged);
        const k = `${label} | ${reason}`;
        combos[k] = (combos[k] ?? 0) + 1;
        if (!examples[k] || examples[k].length < 3) {
          const [repo] = id.split("|");
          examples[k] = [
            ...(examples[k] ?? []),
            {
              line: info.line,
              name: info.name,
              permalink: lib.permalink(repo, info.file, info.line),
            },
          ];
        }
      }
      return {
        combos: Object.fromEntries(
          Object.entries(combos).sort((a, b) => b[1] - a[1])
        ),
        examples,
        views,
      };
    };
    result.agreement[key] = {
      "func-style": compare(
        "func-style",
        [
          "oxlint/func-style",
          "eslint/func-style",
          "biome/useConsistentFunctionStyle",
        ],
        funcStyleReason
      ),
      "func-style-declaration": compare(
        "func-style-declaration",
        [
          "oxlint/func-style:declaration",
          "eslint/func-style:declaration",
          "biome/useConsistentFunctionStyle:declaration",
        ],
        declarationReason
      ),
      "func-style-declaration+arrows": compare(
        "func-style-declaration",
        [
          "oxlint/func-style:declaration+arrows",
          "eslint/func-style:declaration+arrows",
          "biome/useConsistentFunctionStyle:declaration+arrows",
        ],
        declarationReason
      ),
      ubd: compare(
        "ubd",
        [
          "oxlint/no-use-before-define",
          "eslint/ultracite:no-use-before-define",
          "biome/noInvalidUseBeforeDeclaration",
        ],
        ubdReason
      ),
      "ubd-eslint-variants": compare(
        "ubd",
        [
          "oxlint/no-use-before-define",
          "eslint/no-use-before-define",
          "eslint/ts/no-use-before-define",
        ],
        ubdReason
      ),
      "ubd-same-context": compare(
        "ubd",
        [
          "oxlint/no-use-before-define:same-context",
          "eslint/ts/no-use-before-define:same-context",
          "biome/noInvalidUseBeforeDeclaration",
        ],
        ubdReason
      ),
    };
  }
  lib.writeJson(join(lib.RESULTS_DIR, "linters.json"), result);
  rmSync(CONFIGS, { force: true, recursive: true });
};

main();
