// The hand classification of type-import reports.
//
//   --worksheet  draws the seeded sample (frozen in results/type-imports/sample.json; --resample
//                draws again): 80 declarations the type-import rules report in source files of
//                the twelve external repos (ESLint's raw reports, joined in type-imports-linters.cjs),
//                stratified, with repos taken round-robin inside each stratum:
//                  T1 14  every binding used only as a type (consistent-type-imports' "all"), the
//                         target a file in the clone with top-level side effects
//                  T0 14  the same, any other target (no side effects, a package, unresolved)
//                  M  12  some bindings used only as types (the "some" message: a split)
//                  I  12  an `import()` type annotation
//                  N   8  every specifier marked inline (no-import-type-side-effects)
//                  P   8  an inline `type` next to values (consistent-type-specifier-style)
//                  D   8  a module imported twice (import-x/no-duplicates)
//                  X   4  a type reference in a position emitDecoratorMetadata serialises
//                and writes out/type-imports/worksheet.md (with the automatic facts, for rater 1) and
//                worksheet-blind.md (code, settings and the fixes' output only)
//   --print      the blind subset for the second rater (32, seeded)
//   --compute    reads out/type-imports/labels-rater1.json and labels-rater2.json and writes
//                results/type-imports/classifications.json: both raters, shares weighted by each
//                stratum's population, agreement and Cohen's kappa
//
// Codebook (both raters):
//   safe           yes (what each linter's fix writes changes nothing at runtime under this repo's
//                  build) | depends (nothing changes under the repo's settings, but something would
//                  where imports are kept as written: verbatimModuleSyntax, Node's type stripping)
//                  | no (it changes what runs under the repo's own build) | n/a (style or
//                  duplicate only, nothing converted)
//   runtimeChange  none | module-not-loaded (a module that ran from this import no longer does) |
//                  metadata (decorator metadata changes) | order (evaluation order or a cycle
//                  changes) | value-made-type (a value ends up type-only and breaks) | other
//   reliesOnEffect yes (the file or its program needs the target's top-level code to run from this
//                  import) | no | unknown
//   readability    better | same | worse: the code after the fix Ultracite's Oxlint writes, against
//                  as written
//   rightResponse  convert (to `import type`) | split (values and types into two declarations) |
//                  merge (into one declaration per kind) | keep (as written) | other
//   notes          one line
//
// Usage: TYPE_IMPORTS_TMP=<scratch> node research/corpus/scripts/type-imports-sample.cjs --worksheet | --print | --compute
"use strict";

const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./type-imports-lib.cjs");

const SEED = 20_261_117;
const QUOTAS = { D: 8, I: 12, M: 12, N: 8, P: 8, T0: 14, T1: 14, X: 4 };
const REPOS = [...lib.CORE, ...lib.REACT];
const FIELDS = [
  "safe",
  "runtimeChange",
  "reliesOnEffect",
  "readability",
  "rightResponse",
];
const SAMPLE_JSON = join(lib.RESULTS_DIR, "sample.json");
const FIX_DIR = join(lib.TMP, "fixes");

const census = lib.readJson(join(lib.RESULTS_DIR, "census.json"), {
  repos: {},
});

const stratumOf = (it, row) => {
  const concepts = new Set(it.by["eslint|consistent-type-imports|raw"] ?? []);
  const imp =
    it.kind === "import" ? row.imports.find((x) => x.line === it.line) : null;
  if (imp && imp.specifiers.some((s) => s.metadata.length) && concepts.size) {
    return "X";
  }
  if (concepts.has("import() type annotation")) {
    return "I";
  }
  if (concepts.has("type-import (all)")) {
    const mod = row.typeOnlyModules.find((m) => m.spec === imp?.source);
    return mod?.withSideEffects ? "T1" : "T0";
  }
  if (concepts.has("type-import (some)")) {
    return "M";
  }
  if ((it.by["eslint|no-import-type-side-effects|raw"] ?? []).length) {
    return "N";
  }
  if ((it.by["eslint|consistent-type-specifier-style|raw"] ?? []).length) {
    return "P";
  }
  if ((it.by["eslint|no-duplicates|raw"] ?? []).length) {
    return "D";
  }
  return null;
};
const population = () => {
  const rows = [];
  for (const repo of REPOS) {
    const detail = lib.readJson(
      join(lib.OUT_DIR, "linters", `${repo}.json`),
      null
    );
    if (!detail) {
      continue;
    }
    const byRel = new Map(
      lib
        .readJsonl(join(lib.OUT_DIR, "census", `${repo}.jsonl`))
        .filter((r) => !r.error)
        .map((r) => [r.rel, r])
    );
    for (const it of detail.items) {
      const row = byRel.get(it.rel);
      if (!row || row.test) {
        continue;
      }
      const stratum = stratumOf(it, row);
      if (stratum) {
        rows.push({ ...it, repo, stratum });
      }
    }
  }
  return rows;
};
const draw = () => {
  const pop = population();
  const random = lib.rng(SEED);
  const items = [];
  for (const [stratum, quota] of Object.entries(QUOTAS)) {
    const byRepo = new Map();
    for (const t of lib.shuffle(
      pop.filter((t) => t.stratum === stratum),
      random
    )) {
      if (!byRepo.has(t.repo)) {
        byRepo.set(t.repo, []);
      }
      byRepo.get(t.repo).push(t);
    }
    const order = lib.shuffle([...byRepo.keys()], random);
    let picked = 0;
    while (picked < quota && [...byRepo.values()].some((xs) => xs.length)) {
      for (const repo of order) {
        const xs = byRepo.get(repo);
        if (picked >= quota || xs.length === 0) {
          continue;
        }
        items.push(xs.shift());
        picked++;
      }
    }
  }
  return {
    generated: new Date().toISOString(),
    items: items.map((t, i) => ({
      file: t.rel,
      id: `t${String(i + 1).padStart(2, "0")}`,
      kind: t.kind,
      line: t.line,
      permalink: lib.permalink(t.repo, t.rel, t.line),
      repo: t.repo,
      stratum: t.stratum,
    })),
    note: "See the header of type-imports-sample.cjs. Frozen: reruns rewrite the worksheets from this file; --resample draws again.",
    population: Object.fromEntries(
      Object.keys(QUOTAS).map((s) => [
        s,
        pop.filter((t) => t.stratum === s).length,
      ])
    ),
    quotas: QUOTAS,
    seed: SEED,
  };
};

const context = (text, line, before = 4, after = 10) => {
  const lines = text.split("\n");
  const from = Math.max(0, line - 1 - before);
  const to = Math.min(lines.length, line - 1 + after);
  return lines
    .slice(from, to)
    .map(
      (l, i) =>
        `${from + i + 1 === line ? ">" : " "}${String(from + i + 1).padStart(5)}  ${l}`
    )
    .join("\n");
};
// The import declarations of `spec` (or the whole import block) in a fixed copy.
const importsOf = (text, spec) => {
  const sf = lib.ts.createSourceFile(
    "x.tsx",
    text,
    lib.ts.ScriptTarget.ESNext,
    true,
    lib.ts.ScriptKind.TSX
  );
  return sf.statements
    .filter(
      (s) =>
        lib.ts.isImportDeclaration(s) &&
        (!spec || s.moduleSpecifier.text === spec)
    )
    .map((s) => s.getText(sf).replace(/\s+/g, " "));
};
const usageLines = (text, imp) => {
  const lines = text.split("\n");
  const out = [];
  for (const s of imp?.specifiers ?? []) {
    out.push(
      `- \`${s.local}\`: ${s.usage} (value refs ${s.refs.value}, type ${s.refs.type}, typeof ${s.refs.typeof}, export ${s.refs.export}${s.jsx ? `, JSX ${s.jsx}` : ""}${s.metadata.length ? `, metadata ${s.metadata.map((m) => `${m.slot} L${m.line}`).join("; ")}` : ""})${s.source ? `; at its source: ${s.source.is}${s.source.decl ? ` (${s.source.decl})` : ""}` : ""}`
    );
    for (const l of s.valueLines.slice(0, 2)) {
      out.push(
        `    value use L${l}: \`${lines[l - 1]?.trim().slice(0, 120)}\``
      );
    }
  }
  return out;
};
const block = (item, withAuto) => {
  const root = lib.getRepo(item.repo).root;
  const text = readFileSync(join(root, item.file), "utf8");
  const row = lib
    .readJsonl(join(lib.OUT_DIR, "census", `${item.repo}.jsonl`))
    .find((r) => r.rel === item.file);
  const imp =
    item.kind === "import"
      ? row.imports.find((x) => x.line === item.line)
      : null;
  const flags = row.flags ?? {};
  const build = census.build?.[item.repo];
  const mod = imp
    ? row.typeOnlyModules.find((m) => m.spec === imp.source)
    : null;
  const fixed = Object.fromEntries(
    ["oxlint", "eslint", "biome"].map((p) => {
      const f = join(FIX_DIR, item.repo, p, "fixed", item.file);
      return [
        p,
        existsSync(f)
          ? importsOf(readFileSync(f, "utf8"), imp?.source ?? null)
          : ["(no fixed copy)"],
      ];
    })
  );
  const reports =
    lib
      .readJson(join(lib.OUT_DIR, "linters", `${item.repo}.json`), {
        items: [],
      })
      .items.find((x) => x.rel === item.file && x.line === item.line)?.by ?? {};
  const out = [
    `### ${item.id} (${item.stratum}) ${item.repo} \`${item.file}\` L${item.line}`,
    "",
    item.permalink,
    "",
    `Repo settings: ${JSON.stringify(flags)}; build: ${build?.tool ?? "?"}`,
    "",
    "```ts",
    context(text, item.line),
    "```",
    "",
  ];
  if (imp) {
    out.push("Bindings:", ...usageLines(text, imp), "");
  }
  if (withAuto) {
    out.push(
      `Reported (raw): ${Object.entries(reports)
        .filter(([k]) => /\|raw$/.test(k))
        .map(
          ([k, v]) =>
            `${k.replace(/\|raw$/, "")}: ${[...new Set(v)].join(", ")}`
        )
        .join("; ")}`,
      "",
      mod
        ? `Target: ${mod.effects}${mod.target ? ` (\`${mod.target}\`)` : ""}`
        : "Target: (still imported for values, or not a type-only module)",
      ""
    );
  }
  out.push(
    "After each linter's fix (this module's declarations):",
    ...Object.entries(fixed).map(
      ([p, xs]) =>
        `- ${p}: ${xs.length ? xs.map((x) => `\`${x.slice(0, 200)}\``).join(" + ") : "(none: removed)"}`
    ),
    ""
  );
  return out.join("\n");
};
const CODEBOOK = (() => {
  const lines = readFileSync(__filename, "utf8").split("\n");
  const from = lines.findIndex((l) => l.startsWith("// Codebook"));
  const to = lines.findIndex((l, i) => i > from && l.startsWith("// Usage"));
  return lines
    .slice(from + 1, to)
    .map((l) => l.replace(/^\/\/ ?/, ""))
    .join("\n")
    .trim();
})();
const worksheet = (items, withAuto, title) =>
  [
    `# ${title}`,
    "",
    "Label each reported declaration (the line marked `>`) with the codebook below. Write a JSON object keyed by id: { safe, runtimeChange, reliesOnEffect, readability, rightResponse, notes }. You may read the repo's other files at the pinned commit to decide whether the target's side effects are needed.",
    "",
    "```",
    CODEBOOK,
    "```",
    "",
    ...items.map((i) => block(i, withAuto)),
  ].join("\n");
const blindSubset = (sample) =>
  lib
    .shuffle(
      sample.items.map((x) => x.id),
      lib.rng(SEED + 1)
    )
    .slice(0, 32)
    .sort();
const kappa = (pairs) => {
  const n = pairs.length;
  if (n === 0) {
    return null;
  }
  const cats = [...new Set(pairs.flat())];
  const observed = pairs.filter(([a, b]) => a === b).length / n;
  const expected = cats.reduce((sum, c) => {
    const pa = pairs.filter(([a]) => a === c).length / n;
    const pb = pairs.filter(([, b]) => b === c).length / n;
    return sum + pa * pb;
  }, 0);
  return expected === 1
    ? 1
    : Math.round(((observed - expected) / (1 - expected)) * 100) / 100;
};

const main = () => {
  const args = process.argv.slice(2);
  let sample = lib.readJson(SAMPLE_JSON, null);
  if (args.includes("--worksheet")) {
    if (!sample || args.includes("--resample")) {
      sample = draw();
      lib.writeJson(SAMPLE_JSON, sample);
    }
    lib.writeText(
      join(lib.OUT_DIR, "worksheet.md"),
      worksheet(sample.items, true, "Type imports: worksheet (rater 1)")
    );
    lib.writeText(
      join(lib.OUT_DIR, "worksheet-blind.md"),
      worksheet(sample.items, false, "Type imports: worksheet (blind)")
    );
    console.log(
      `sample: ${sample.items.length} items; population ${JSON.stringify(sample.population)}`
    );
  }
  if (args.includes("--print")) {
    const ids = new Set(blindSubset(sample));
    lib.writeText(
      join(lib.OUT_DIR, "worksheet-rater2.md"),
      worksheet(
        sample.items.filter((i) => ids.has(i.id)),
        false,
        "Type imports: worksheet (rater 2, blind)"
      )
    );
    console.log(
      `rater 2 subset: ${ids.size} items -> out/type-imports/worksheet-rater2.md`
    );
  }
  if (args.includes("--compute")) {
    const r1 = lib.readJson(join(lib.OUT_DIR, "labels-rater1.json"), null);
    const r2 = lib.readJson(join(lib.OUT_DIR, "labels-rater2.json"), null);
    if (!r1) {
      console.log("no rater 1 labels; classifications.json left as it is");
      return;
    }
    const missing = sample.items.filter((i) => !r1[i.id]).map((i) => i.id);
    if (missing.length) {
      throw new Error(`rater 1 is missing ${missing.join(", ")}`);
    }
    const weights = Object.fromEntries(
      Object.entries(sample.population).map(([s, n]) => [
        s,
        n / Math.max(1, sample.items.filter((i) => i.stratum === s).length),
      ])
    );
    const shares = {};
    for (const f of FIELDS) {
      const tot = {};
      let w = 0;
      for (const i of sample.items) {
        const v = r1[i.id][f];
        tot[v] = (tot[v] ?? 0) + weights[i.stratum];
        w += weights[i.stratum];
      }
      shares[f] = Object.fromEntries(
        Object.entries(tot)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => [k, Math.round((v / w) * 1000) / 10])
      );
    }
    const byStratum = {};
    for (const s of Object.keys(QUOTAS)) {
      byStratum[s] = {};
      for (const f of FIELDS) {
        byStratum[s][f] = sample.items
          .filter((i) => i.stratum === s)
          .reduce((o, i) => {
            const v = r1[i.id][f];
            o[v] = (o[v] ?? 0) + 1;
            return o;
          }, {});
      }
    }
    const ids = blindSubset(sample);
    const agreement = {};
    if (r2) {
      for (const f of FIELDS) {
        const pairs = ids
          .filter((id) => r2[id])
          .map((id) => [r1[id][f], r2[id][f]]);
        agreement[f] = {
          agree: pairs.filter(([a, b]) => a === b).length,
          kappa: kappa(pairs),
          n: pairs.length,
        };
      }
    }
    lib.writeJson(join(lib.RESULTS_DIR, "classifications.json"), {
      agreement,
      blindSubset: ids,
      byStratum,
      codebook: CODEBOOK,
      generated: new Date().toISOString(),
      labels: Object.fromEntries(
        sample.items.map((i) => [
          i.id,
          {
            permalink: i.permalink,
            rater1: r1[i.id],
            ...(r2?.[i.id] ? { rater2: r2[i.id] } : {}),
            stratum: i.stratum,
          },
        ])
      ),
      note: "Rater 1, a subagent, labelled all items from the worksheet with the automatic facts (each linter's fix, the target's top-level code, the repo's flags); rater 2, a separate subagent working blind (the code, the repo's settings and each fix's output, without the automatic facts), labelled the subset from the blind worksheet. Shares are rater 1's, weighted by each stratum's population (sample.json).",
      shares,
      weights,
    });
    console.log(JSON.stringify({ agreement, shares }, null, 1));
  }
};

main();
