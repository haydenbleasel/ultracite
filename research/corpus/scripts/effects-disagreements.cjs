// What the linters report on the corpus's hooks, joined hook by hook, and why the three
// implementations of the dependency rule disagree.
//
// Reads the census rows (effects-census.cjs) and the lint rows (effects-linters.cjs). For each
// hook and each linter view, raw and reported:
//   eslint      Ultracite's ESLint react preset as configured (only .jsx/.tsx files get it)
//   eslint-all  the same rules on every file (the counterfactual run on .ts/.js hook files added)
//   oxlint      react/exhaustive-deps (reported as react-hooks(exhaustive-deps))
//   oxlint-compiler  Oxlint's React Compiler port: exhaustive-effect-dependencies, memo-dependencies
//   biome       useExhaustiveDependencies
// the diagnostics' kinds (missing, unnecessary, unstable, ref in cleanup …), the names each lists,
// and for every hook one linter flags and another doesn't, the reason, from the hook's file, name,
// the names listed and what each name is in the callback (effects-lib.cjs capturesOf).
//
// Usage: node research/corpus/scripts/effects-disagreements.cjs
// Writes results/react-effects/corpus-lint.json and out/react-effects/hook-flags.jsonl (one row
// per hook with every linter's view).
"use strict";

const { join } = require("node:path");

const lib = require("./effects-lib.cjs");

const REPOS = lib.ALL;
const DEP = {
  biome: "lint/correctness/useExhaustiveDependencies",
  eslint: "react-hooks/exhaustive-deps",
  oxlint: "react/exhaustive-deps",
};
const KINDS = {
  biome: lib.BIOME_KINDS,
  eslint: lib.ESLINT_KINDS,
  "eslint-all": lib.ESLINT_KINDS,
  oxlint: lib.OXLINT_KINDS,
};
const isJsx = (f) => /\.(?:tsx|jsx)$/.test(f);

// The names a diagnostic lists.
const namesOf = (linter, message) => {
  const m = message ?? "";
  if (linter === "biome") {
    const x =
      /dependency on (.+?)\.?$/.exec(m) ??
      /more dependencies than necessary: (.+?)\.?$/.exec(m) ??
      /more specific than its captures: (.+?)\.?$/.exec(m) ??
      /^(.+?) changes on every re-render/.exec(m);
    return x
      ? x[1]
          .split(/,\s*/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  }
  const list =
    /dependenc(?:y|ies): (.+?)(?:\. Either|\. |$)/.exec(m)?.[1] ??
    /depends on `([^`]+)`/.exec(m)?.[1] ??
    /The '([^']+)' (?:object|function|array|conditional|logical expression)/.exec(
      m
    )?.[1] ??
    null;
  if (!list) {
    return [];
  }
  const quoted = [...list.matchAll(/'([^']+)'|`([^`]+)`/g)].map(
    (x) => x[1] ?? x[2]
  );
  return quoted.length > 0
    ? quoted
    : list
        .split(/,\s*(?:and\s+)?|\s+and\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
};

const loadLint = (name, linter, mode) =>
  lib.readJsonl(join(lib.OUT_DIR, "lint", `${name}.${linter}.${mode}.jsonl`));

const viewsFor = (name, mode) => {
  const eslint = loadLint(name, "eslint", mode);
  const eslintAll = [...eslint, ...loadLint(name, "eslint-all-files", mode)];
  const oxlint = loadLint(name, "oxlint", mode);
  const biome = loadLint(name, "biome", mode);
  return {
    biome: biome.filter((d) => d.rule === DEP.biome),
    eslint: eslint.filter((d) => d.rule === DEP.eslint),
    "eslint-all": eslintAll.filter((d) => d.rule === DEP.eslint),
    oxlint: oxlint.filter((d) => d.rule === DEP.oxlint),
    "oxlint-compiler": oxlint.filter((d) =>
      [
        "react/exhaustive-effect-dependencies",
        "react/memo-dependencies",
      ].includes(d.rule)
    ),
    "eslint-compiler": eslint.filter((d) =>
      [
        "react-hooks/exhaustive-effect-dependencies",
        "react-hooks/memo-dependencies",
        "react-hooks/memoized-effect-dependencies",
      ].includes(d.rule)
    ),
  };
};

// Why `a` flags a hook that `b` doesn't.
const reasonFor = (hook, a, b, flags) => {
  const fa = flags[a];
  const fb = flags[b];
  const reasons = [];
  const caps = new Map((hook.captures ?? []).map((c) => [c.path, c]));
  const capByName = new Map();
  for (const c of hook.captures ?? []) {
    if (!capByName.has(c.name)) {
      capByName.set(c.name, c);
    }
  }
  const depTexts = new Set(hook.deps.map((d) => d.text.replace(/\?\./g, ".")));
  if (b.startsWith("eslint") && b !== "eslint-all" && !isJsx(hook.file)) {
    reasons.push("eslint-skips-non-jsx-file");
  }
  if (b.startsWith("eslint") && hook.name === "useInsertionEffect") {
    reasons.push("eslint-skips-useInsertionEffect");
  }
  if (!hook.builtin) {
    reasons.push("custom-hook");
  }
  const kindsA = new Set(fa.kinds);
  const onlyUnnecessary =
    kindsA.size > 0 && [...kindsA].every((k) => k === "unnecessary");
  if (onlyUnnecessary && hook.kind === "effect") {
    reasons.push("unnecessary-dependency-in-effect");
  } else if (onlyUnnecessary) {
    reasons.push("unnecessary-dependency");
  }
  for (const k of [
    "ref-cleanup",
    "complex",
    "non-literal",
    "unstable",
    "async",
    "unknown-callback",
    "too-specific",
    "literal",
    "other",
  ]) {
    if (kindsA.has(k) && !new Set(fb.kinds).has(k)) {
      reasons.push(`kind:${k}`);
    }
  }
  // Names `a` wants that `b` doesn't, by what they are.
  const missingA = fa.missing.filter((n) => !fb.missing.includes(n));
  for (const n of missingA) {
    const plain = n.replace(/\?\./g, ".");
    const root = plain.split(".")[0];
    const cap = caps.get(n) ?? caps.get(plain) ?? capByName.get(root);
    if (plain.includes(".")) {
      // a member path: is its root (or a shorter prefix) already in the array, or wanted by b?
      const prefixes = plain
        .split(".")
        .map((_, i, parts) => parts.slice(0, i + 1).join("."))
        .slice(0, -1);
      if (prefixes.some((p) => depTexts.has(p) || fb.missing.includes(p))) {
        reasons.push(cap?.called ? "member-path-method" : "member-path");
        continue;
      }
      if (n.includes("?.")) {
        reasons.push("optional-chain");
        continue;
      }
    }
    if (cap) {
      if (
        [
          "setter",
          "dispatch",
          "ref",
          "effectEvent",
          "transition",
          "constant",
        ].includes(cap.kind)
      ) {
        reasons.push(`stable:${cap.kind}`);
      } else if (["outer", "import"].includes(cap.kind)) {
        reasons.push("outer-scope");
      } else {
        reasons.push(`missing:${cap.kind}`);
      }
    } else {
      reasons.push("missing:unresolved");
    }
  }
  if (reasons.length === 0) {
    reasons.push("unexplained");
  }
  return [...new Set(reasons)];
};
const PRECEDENCE = [
  "eslint-skips-non-jsx-file",
  "eslint-skips-useInsertionEffect",
  "custom-hook",
  "unnecessary-dependency-in-effect",
  "unnecessary-dependency",
  "member-path-method",
  "member-path",
  "optional-chain",
  "outer-scope",
  "kind:ref-cleanup",
  "kind:unstable",
  "kind:complex",
  "kind:non-literal",
  "kind:literal",
  "kind:async",
  "kind:unknown-callback",
  "kind:too-specific",
];
const primary = (reasons) =>
  PRECEDENCE.find((r) => reasons.includes(r)) ??
  reasons.find((r) => r.startsWith("stable:")) ??
  reasons[0];

const main = () => {
  const census = lib.readJson(join(lib.RESULTS_DIR, "census.json"));
  const out = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Raw: every disable comment neutralised; reported: as written. A hook is flagged by a view when any of the view's dependency-rule diagnostics joins to it (effects-lib.cjs matchHook). Denominators are the census's hooks.",
    tools: lib.toolVersions(),
  };
  const rows = [];
  const perRepo = {};
  const messages = {};
  for (const name of REPOS) {
    const hooks = lib.readJsonl(join(lib.OUT_DIR, "census", `${name}.jsonl`));
    const byId = new Map(hooks.map((h) => [h.id, h]));
    perRepo[name] = { all: {}, hooks: hooks.length };
    for (const mode of ["raw", "reported"]) {
      const views = viewsFor(name, mode);
      for (const [view, unsorted] of Object.entries(views)) {
        // Oxlint prints in a parallel order; sort so the message examples don't depend on it
        const ds = [...unsorted].sort(
          (x, y) =>
            (x.file < y.file ? -1 : x.file > y.file ? 1 : 0) ||
            (x.line ?? 0) - (y.line ?? 0) ||
            (x.column ?? 0) - (y.column ?? 0) ||
            (x.message < y.message ? -1 : x.message > y.message ? 1 : 0)
        );
        const linter = view.replace(/-compiler$/, "");
        const table = KINDS[view] ?? KINDS[linter];
        for (const d of ds) {
          const h = byId.get(d.hook);
          if (!h) {
            continue;
          }
          h.flags ??= {};
          h.flags[mode] ??= {};
          const f = (h.flags[mode][view] ??= {
            diagnostics: 0,
            kinds: [],
            messages: [],
            missing: [],
            unnecessary: [],
          });
          f.diagnostics++;
          const kind = view.endsWith("compiler")
            ? /missing/i.test(d.message)
              ? "missing"
              : /extra/i.test(d.message)
                ? "unnecessary"
                : "other"
            : lib.kindOf(table, d.message);
          f.kinds.push(kind);
          const labelNames = (d.labels ?? [])
            .map(
              (l) =>
                /(?:Missing|Unnecessary|Extra) dependency `([^`]+)`/.exec(
                  l.label ?? ""
                )?.[1]
            )
            .filter(Boolean);
          const names = view.endsWith("compiler")
            ? labelNames
            : namesOf(linter.replace(/-all$/, ""), d.message);
          if (kind === "missing") {
            f.missing.push(...names);
          } else if (kind === "unnecessary") {
            f.unnecessary.push(...names);
          }
          if (f.messages.length < 4) {
            f.messages.push(d.message.split("\n")[0].slice(0, 300));
          }
          if (mode === "raw") {
            const key = `${view} · ${kind}`;
            messages[key] ??= [];
            if (messages[key].length < 3) {
              messages[key].push({
                help: d.help ?? null,
                labels: (d.labels ?? []).map((l) => l.label).filter(Boolean),
                message: d.message
                  .split("\n")
                  .slice(0, 3)
                  .join(" ")
                  .slice(0, 400),
                permalink: lib.permalink(name, d.file, d.line),
                suggestions: (d.suggestions ?? []).map((s) => ({
                  desc: s.desc,
                  text: s.fix?.text ?? null,
                })),
              });
            }
          }
        }
      }
    }
    for (const h of hooks) {
      rows.push({ ...h, repo: name, set: lib.setOf(name) });
    }
  }

  // ── per-view counts ──
  const VIEWS = [
    "eslint",
    "eslint-all",
    "oxlint",
    "oxlint-compiler",
    "eslint-compiler",
    "biome",
  ];
  const flagged = (h, mode, view) => Boolean(h.flags?.[mode]?.[view]);
  const tally = (hs) => {
    const t = {
      effects: hs.filter((h) => h.kind === "effect").length,
      hooks: hs.length,
    };
    for (const mode of ["raw", "reported"]) {
      t[mode] = {};
      for (const v of VIEWS) {
        const f = hs.filter((h) => flagged(h, mode, v));
        t[mode][v] = {
          byHookKind: lib.countBy(f, (h) => h.kind),
          byKind: lib.countBy(
            f.flatMap((h) => [...new Set(h.flags[mode][v].kinds)]),
            (k) => k
          ),
          diagnostics: f.reduce((s, h) => s + h.flags[mode][v].diagnostics, 0),
          effects: f.filter((h) => h.kind === "effect").length,
          hooks: f.length,
          pctOfHooks: lib.pct(f.length, hs.length),
          pctOfEffects: lib.pct(
            f.filter((h) => h.kind === "effect").length,
            hs.filter((h) => h.kind === "effect").length
          ),
          missing: f.filter((h) => h.flags[mode][v].kinds.includes("missing"))
            .length,
          unnecessary: f.filter((h) =>
            h.flags[mode][v].kinds.includes("unnecessary")
          ).length,
        };
      }
    }
    return t;
  };
  out.denominators = {};
  out.byRepo = {};
  for (const name of REPOS) {
    const hs = rows.filter((h) => h.repo === name);
    out.byRepo[name] = tally(hs);
    const r = census?.repos?.[name];
    out.denominators[name] = r
      ? {
          effects: r.effects.n,
          files: r.files,
          hooks: r.hooks,
          jsxLines: r.jsxLines,
          lines: r.lines,
        }
      : null;
  }
  out.pooled = {
    all: tally(rows),
    core: tally(rows.filter((h) => h.set === "core")),
    react: tally(rows.filter((h) => h.set === "react")),
  };
  // per 10k lines
  for (const set of ["core", "react"]) {
    const lines = Object.entries(out.denominators)
      .filter(([n, d]) => d && lib.setOf(n) === set)
      .reduce((s, [, d]) => s + d.lines, 0);
    out.pooled[set].lines = lines;
    for (const v of VIEWS) {
      out.pooled[set].raw[v].per10kLines = lib.per10k(
        out.pooled[set].raw[v].diagnostics,
        lines
      );
    }
  }

  // ── overlap and disagreements (raw) ──
  const trio = ["eslint", "oxlint", "biome"];
  const venn = {};
  for (const h of rows) {
    const key = trio.filter((v) => flagged(h, "raw", v)).join("+") || "none";
    venn[key] = (venn[key] ?? 0) + 1;
  }
  out.overlapRaw = venn;
  const vennAll = {};
  for (const h of rows) {
    const key =
      ["eslint-all", "oxlint", "biome"]
        .filter((v) => flagged(h, "raw", v))
        .join("+") || "none";
    vennAll[key] = (vennAll[key] ?? 0) + 1;
  }
  out.overlapRawEslintEverywhere = vennAll;
  const empty = { kinds: [], missing: [], unnecessary: [] };
  const pairs = [
    ["oxlint", "eslint"],
    ["eslint", "oxlint"],
    ["biome", "eslint"],
    ["eslint", "biome"],
    ["biome", "oxlint"],
    ["oxlint", "biome"],
    ["oxlint", "eslint-all"],
    ["eslint-all", "oxlint"],
    ["oxlint-compiler", "oxlint"],
    ["oxlint", "oxlint-compiler"],
  ];
  out.disagreements = {};
  const disagreementRows = [];
  for (const [a, b] of pairs) {
    const list = rows.filter(
      (h) => flagged(h, "raw", a) && !flagged(h, "raw", b)
    );
    const reasons = list.map((h) => {
      const fl = { [a]: h.flags.raw[a], [b]: h.flags.raw?.[b] ?? empty };
      const rs = reasonFor(h, a, b, fl);
      return { h, primary: primary(rs), reasons: rs };
    });
    out.disagreements[`${a} not ${b}`] = {
      n: list.length,
      primary: lib.countBy(reasons, (r) => r.primary),
      anyReason: lib.countBy(
        reasons.flatMap((r) => r.reasons),
        (x) => x
      ),
      examples: Object.fromEntries(
        Object.entries(lib.countBy(reasons, (r) => r.primary)).map(([p]) => [
          p,
          reasons
            .filter((r) => r.primary === p)
            .slice(0, 3)
            .map((r) => ({
              deps: r.h.deps.map((d) => d.text),
              hook: r.h.name,
              messages: r.h.flags.raw[a].messages.slice(0, 2),
              permalink: lib.permalink(
                r.h.repo,
                r.h.file,
                r.h.line,
                r.h.endLine
              ),
            })),
        ])
      ),
    };
    for (const r of reasons) {
      disagreementRows.push({
        a,
        b,
        id: r.h.id,
        primary: r.primary,
        reasons: r.reasons,
      });
    }
  }
  // Same hook, different names: hooks flagged by both ESLint and Biome whose missing names differ.
  const both = rows.filter(
    (h) => flagged(h, "raw", "eslint") && flagged(h, "raw", "biome")
  );
  out.sameHookDifferentNames = {
    eslintAndBiome: both.length,
    namesDiffer: both.filter(
      (h) =>
        [...new Set(h.flags.raw.eslint.missing)].sort().join() !==
        [...new Set(h.flags.raw.biome.missing)].sort().join()
    ).length,
  };
  const bothOx = rows.filter(
    (h) => flagged(h, "raw", "eslint") && flagged(h, "raw", "oxlint")
  );
  out.sameHookDifferentNames.eslintAndOxlint = bothOx.length;
  out.sameHookDifferentNames.eslintOxlintNamesDiffer = bothOx.filter(
    (h) =>
      [...new Set(h.flags.raw.eslint.missing)].sort().join() !==
      [...new Set(h.flags.raw.oxlint.missing)].sort().join()
  ).length;
  out.messages = Object.fromEntries(Object.entries(messages).sort());
  lib.writeJsonl(join(lib.OUT_DIR, "disagreements.jsonl"), disagreementRows);
  lib.writeJsonl(
    join(lib.OUT_DIR, "hook-flags.jsonl"),
    rows.map((h) => ({
      captures: h.captures,
      category: h.category ?? null,
      deps: h.deps,
      depsForm: h.depsForm,
      endLine: h.endLine,
      file: h.file,
      flags: h.flags ?? {},
      id: h.id,
      kind: h.kind,
      line: h.line,
      name: h.name,
      owner: h.owner,
      repo: h.repo,
      set: h.set,
    }))
  );
  lib.writeJson(join(lib.RESULTS_DIR, "corpus-lint.json"), out);
  console.log(
    JSON.stringify(
      {
        overlap: venn,
        overlapEslintEverywhere: vennAll,
        same: out.sameHookDifferentNames,
      },
      null,
      1
    )
  );
  for (const [k, v] of Object.entries(out.disagreements)) {
    console.log(k, v.n, JSON.stringify(v.primary));
  }
  for (const set of ["core", "react"]) {
    const t = out.pooled[set].raw;
    console.log(
      set,
      out.pooled[set].hooks,
      Object.fromEntries(
        VIEWS.map((v) => [v, `${t[v].hooks} (${t[v].pctOfHooks}%)`])
      )
    );
  }
};

main();
