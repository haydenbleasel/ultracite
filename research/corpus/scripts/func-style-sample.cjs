// The hand classification.
//
//   --worksheet  draws the seeded samples (frozen in results/func-style/sample.json; --resample
//                draws again) and writes worksheets with code context and permalinks:
//                  F  80-odd function declarations func-style reports (source, the twelve
//                     external repos): 6 per repo at random, plus oversamples of declarations
//                     that need a function expression, assertion and never-returning
//                     declarations, and declarations used at module evaluation above their line
//                  U  80 no-use-before-define reports from Ultracite's Oxlint, stratified by the
//                     census's runtime class, repos at random within each class
//   --print      the blind subsets for the second rater (30 of each, seeded), without any
//                automatic label
//   --compute    reads out/func-style/labels-rater1.json and labels-rater2.json and writes
//                results/func-style/classifications.json: both raters, shares (the random part
//                of F weighted by each repo's population), agreement and Cohen's kappa
//                (classification-agreement.cjs's formula), and rater 1 against the census's
//                automatic labels
//
// Codebook (both raters):
//   F conversion   clean (a const arrow, nothing else changes) | reorder (it must move, or
//                  something must move, for no-use-before-define; behaviour kept) |
//                  function-expression (this, arguments, new.target, new, prototype, generator) |
//                  blocked (can't become a const without changing behaviour or types; say why)
//   F reads        better | same | worse, converted (and reordered if needed) against as written
//   F concise      yes (the converted arrow could drop its braces: a single return) | no
//   U runtime      harmless-hoisted (a function declaration, initialised before anything runs) |
//                  harmless-deferred (read inside a function that only runs after the binding is
//                  initialised) | crash-at-evaluation (read while the module or block runs,
//                  before its line) | crash-when-called | type-only | harmless-export-list |
//                  unclear
//   U order        top-down (the reference is in a caller written above the thing it uses) |
//                  bottom-up | n/a (not between two declarations)
//
// Usage: node research/corpus/scripts/func-style-sample.cjs --worksheet | --print | --compute
"use strict";

const { join } = require("node:path");

const lib = require("./func-style-lib.cjs");
const { conversionOf } = require("./func-style-census.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const LINTERS = join(lib.OUT_DIR, "linters");
const SEED = 20_261_029;
const PER_REPO = 6;
const OVERSAMPLE = {
  "assertion-or-never": 2,
  "function-expression": 4,
  "used-at-evaluation": 4,
};
const U_QUOTAS = {
  "deferred-class": 8,
  "deferred-enum-namespace": 6,
  "deferred-maybe-module-evaluation": 14,
  "deferred-variable": 18,
  "hoisted-function-deferred": 21,
  "hoisted-function-same-context": 12,
  other: 4,
};
const REPOS = [...lib.CORE, ...lib.REACT];

const ubdStratum = (u) => {
  if (u.cls === "deferred") {
    if (u.defType === "ClassName") {
      return "deferred-class";
    }
    if (u.defType === "TSEnumName" || u.defType === "TSModuleName") {
      return "deferred-enum-namespace";
    }
    return "deferred-variable";
  }
  if (
    [
      "hoisted-function-deferred",
      "hoisted-function-same-context",
      "deferred-maybe-module-evaluation",
    ].includes(u.cls)
  ) {
    return u.cls;
  }
  return "other";
};
const autoRuntime = (u) => {
  switch (u.cls) {
    case "hoisted-function-deferred":
    case "hoisted-function-same-context":
      return "harmless-hoisted";
    case "deferred":
    case "deferred-maybe-module-evaluation":
      return "harmless-deferred";
    case "export-specifier":
      return "harmless-export-list";
    case "type-only":
      return "type-only";
    default:
      return /^tdz/.test(u.cls) ? "crash-at-evaluation" : "unclear";
  }
};

const draw = () => {
  const random = lib.rng(SEED);
  const F = [];
  const used = new Set();
  const ubdUsedAtEval = new Map();
  for (const name of REPOS) {
    for (const u of lib.readJsonl(join(CENSUS, `${name}.ubd.jsonl`))) {
      if (
        !u.test &&
        u.cls === "hoisted-function-same-context" &&
        u.moduleBinding
      ) {
        ubdUsedAtEval.set(`${name}|${u.file}|${u.name}|${u.defLine}`, u);
      }
    }
  }
  const pop = {};
  const pools = {
    "assertion-or-never": [],
    "function-expression": [],
    "used-at-evaluation": [],
  };
  for (const name of REPOS) {
    const fns = lib
      .readJsonl(join(CENSUS, `${name}.functions.jsonl`))
      .filter(
        (f) =>
          !f.test &&
          f.type === "FunctionDeclaration" &&
          f.form !== "export-default-declaration" &&
          !f.overloadedEslint
      );
    pop[name] = fns.length;
    const picked = lib.shuffle(fns, random).slice(0, PER_REPO);
    for (const f of picked) {
      used.add(`${name}|${f.file}|${f.i}`);
      F.push({ fn: f, repo: name, stratum: "random" });
    }
    for (const f of fns) {
      const c = conversionOf(f);
      if (c.startsWith("function-expression")) {
        pools["function-expression"].push({ fn: f, repo: name });
      }
      if (f.predicate === "asserts" || f.returnsNever) {
        pools["assertion-or-never"].push({ fn: f, repo: name });
      }
      if (ubdUsedAtEval.has(`${name}|${f.file}|${f.name}|${f.line}`)) {
        pools["used-at-evaluation"].push({ fn: f, repo: name });
      }
    }
  }
  for (const [stratum, n] of Object.entries(OVERSAMPLE)) {
    const pool = lib
      .shuffle(pools[stratum], random)
      .filter((x) => !used.has(`${x.repo}|${x.fn.file}|${x.fn.i}`));
    for (const x of pool.slice(0, n)) {
      used.add(`${x.repo}|${x.fn.file}|${x.fn.i}`);
      F.push({ ...x, stratum });
    }
  }
  // U: Oxlint's reports (Ultracite's no-use-before-define), joined to candidates
  const U = [];
  const upools = {};
  for (const name of REPOS) {
    const cand = new Map(
      lib
        .readJsonl(join(CENSUS, `${name}.ubd.jsonl`))
        .map((u) => [`${u.file}:${u.line}:${u.column}`, u])
    );
    for (const r of lib.readJsonl(join(LINTERS, `${name}.jsonl`))) {
      if (
        r.view !== "oxlint/no-use-before-define" ||
        r.mode !== "raw" ||
        r.test ||
        !r.item
      ) {
        continue;
      }
      const u = cand.get(r.item);
      if (!u) {
        continue;
      }
      const s = ubdStratum(u);
      (upools[s] ??= []).push({ repo: name, ubd: u });
    }
  }
  for (const [s, n] of Object.entries(U_QUOTAS)) {
    for (const x of lib.shuffle(upools[s] ?? [], random).slice(0, n)) {
      U.push({ ...x, stratum: s });
    }
  }
  return {
    F: F.map((x, i) => ({
      file: x.fn.file,
      id: `F${String(i + 1).padStart(2, "0")}`,
      line: x.fn.line,
      name: x.fn.name,
      repo: x.repo,
      stratum: x.stratum,
    })),
    U: U.map((x, i) => ({
      column: x.ubd.column,
      defLine: x.ubd.defLine,
      file: x.ubd.file,
      id: `U${String(i + 1).padStart(2, "0")}`,
      line: x.ubd.line,
      name: x.ubd.name,
      repo: x.repo,
      stratum: x.stratum,
    })),
    populations: {
      F: pop,
      U: Object.fromEntries(
        Object.entries(upools).map(([k, v]) => [k, v.length])
      ),
      oversamplePools: Object.fromEntries(
        Object.entries(pools).map(([k, v]) => [k, v.length])
      ),
    },
    seed: SEED,
  };
};

const fnOf = (item) =>
  lib
    .readJsonl(join(CENSUS, `${item.repo}.functions.jsonl`))
    .find(
      (f) =>
        f.file === item.file &&
        f.line === item.line &&
        f.type === "FunctionDeclaration"
    );
const ubdOf = (item) =>
  lib
    .readJsonl(join(CENSUS, `${item.repo}.ubd.jsonl`))
    .find(
      (u) =>
        u.file === item.file && u.line === item.line && u.column === item.column
    );
const fence = (lines, from, to, mark = new Set()) =>
  [
    "```ts",
    ...lines
      .slice(Math.max(0, from - 1), Math.min(lines.length, to))
      .map(
        (l, k) =>
          `${String(from + k).padStart(5)}${mark.has(from + k) ? ">" : " "} ${l.length > 150 ? `${l.slice(0, 150)}…` : l}`
      ),
    "```",
  ].join("\n");

const fBlock = (item, blind) => {
  const f = fnOf(item);
  const text = lib.readFileSync(
    join(lib.getRepo(item.repo).root, item.file),
    "utf8"
  );
  const lines = text.split("\n");
  const inv = lib.inventory(text, item.file);
  const refs = (inv.ubd ?? []).filter(
    (u) => u.name === f.name && u.defLine === f.line
  );
  const start = f.stmtLine ?? f.line;
  const end = Math.min(f.stmtEndLine ?? f.endLine, start + 34);
  const facts = [
    `form ${f.form}, scope ${f.scope}, ${f.lines} lines${f.async ? ", async" : ""}${f.generator ? ", generator" : ""}`,
    `params ${f.params} (${f.paramsTyped} typed), return type ${f.returnTyped ? "yes" : "no"}${f.predicate ? `, ${f.predicate} predicate` : ""}${f.returnsNever ? ", returns never" : ""}`,
    `uses this ${f.usesThis}, arguments ${f.usesArguments}, new.target ${f.usesNewTarget}, called with new ${(f.calledWithNew ?? 0) + (f.crossFileNew ?? 0)}, prototype ${(f.prototypeUse ?? 0) + (f.crossFilePrototype ?? 0)}`,
    `value references above its line in this file: ${refs.length}${
      refs.length
        ? ` (lines ${refs
            .map((u) => u.line)
            .slice(0, 8)
            .join(", ")})`
        : ""
    }`,
  ];
  const out = [
    `### ${item.id} ${item.repo} ${item.file}:${item.line} \`${f.name}\``,
    "",
    lib.permalink(item.repo, item.file, start, f.stmtEndLine ?? f.endLine),
    "",
    ...facts.map((x) => `- ${x}`),
    "",
    fence(lines, start, end),
    ...(end < (f.stmtEndLine ?? f.endLine)
      ? [`(… ${(f.stmtEndLine ?? f.endLine) - end} more lines)`]
      : []),
  ];
  for (const u of refs.slice(0, 3)) {
    out.push(
      "",
      `Reference at line ${u.line}:`,
      fence(lines, u.line - 3, u.line + 2, new Set([u.line]))
    );
  }
  if (!blind) {
    out.push(
      "",
      `automatic: ${conversionOf(f)}; single return ${Boolean(f.singleReturn)}`
    );
  }
  out.push(
    "",
    "Labels: conversion = clean | reorder | function-expression | blocked; reads = better | same | worse; concise = yes | no; note",
    ""
  );
  return out.join("\n");
};
const uBlock = (item, blind) => {
  const u = ubdOf(item);
  const text = lib.readFileSync(
    join(lib.getRepo(item.repo).root, item.file),
    "utf8"
  );
  const lines = text.split("\n");
  const out = [
    `### ${item.id} ${item.repo} ${item.file}:${item.line} \`${u.name}\` (defined at line ${u.defLine})`,
    "",
    lib.permalink(item.repo, item.file, item.line),
    "",
    `- the binding: ${u.defType === "Variable" ? `${u.defKind} (${u.initForm})` : u.defType}, in a ${u.scopeType} scope`,
    "",
    "The reference:",
    fence(lines, item.line - 6, item.line + 3, new Set([item.line])),
    "",
    "The definition:",
    fence(lines, u.defLine - 1, u.defLine + 3, new Set([u.defLine])),
  ];
  if (!blind) {
    out.push(
      "",
      `automatic: ${u.cls}${u.callback ? ` (callback of ${u.callback.callee}, ${u.callback.kind})` : ""}${u.maybeIndirect ? " (maybe called at evaluation)" : ""}`
    );
  }
  out.push(
    "",
    "Labels: runtime = harmless-hoisted | harmless-deferred | crash-at-evaluation | crash-when-called | type-only | harmless-export-list | unclear; order = top-down | bottom-up | n/a; note",
    ""
  );
  return out.join("\n");
};

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
const blindSubset = (sample) => {
  const random = lib.rng(SEED + 1);
  return {
    F: lib
      .shuffle(
        sample.F.map((x) => x.id),
        random
      )
      .slice(0, 30)
      .sort(),
    U: lib
      .shuffle(
        sample.U.map((x) => x.id),
        random
      )
      .slice(0, 30)
      .sort(),
  };
};

const main = () => {
  const samplePath = join(lib.RESULTS_DIR, "sample.json");
  let sample = lib.readJson(samplePath, null);
  if (lib.flag("worksheet")) {
    if (!sample || lib.flag("resample")) {
      sample = draw();
      lib.writeJson(samplePath, sample);
    }
    lib.writeText(
      join(lib.OUT_DIR, "worksheet-F.md"),
      `# func-style sample (declarations)\n\n${sample.F.map((x) => fBlock(x, false)).join("\n")}`
    );
    lib.writeText(
      join(lib.OUT_DIR, "worksheet-U.md"),
      `# no-use-before-define sample\n\n${sample.U.map((x) => uBlock(x, false)).join("\n")}`
    );
    console.log(
      `F ${sample.F.length} (${JSON.stringify(sample.populations.oversamplePools)}), U ${sample.U.length} (${JSON.stringify(sample.populations.U)})`
    );
  }
  if (lib.flag("print")) {
    const sub = blindSubset(sample);
    lib.writeText(
      join(lib.OUT_DIR, "blind-F.md"),
      `# Declarations\n\n${sample.F.filter((x) => sub.F.includes(x.id))
        .map((x) => fBlock(x, true))
        .join("\n")}`
    );
    lib.writeText(
      join(lib.OUT_DIR, "blind-U.md"),
      `# Use-before-define reports\n\n${sample.U.filter((x) =>
        sub.U.includes(x.id)
      )
        .map((x) => uBlock(x, true))
        .join("\n")}`
    );
    console.log(
      `blind subsets: F ${sub.F.length}, U ${sub.U.length} -> out/func-style/blind-{F,U}.md`
    );
  }
  if (lib.flag("compute")) {
    const r1 = lib.readJson(join(lib.OUT_DIR, "labels-rater1.json"), null);
    const r2 = lib.readJson(join(lib.OUT_DIR, "labels-rater2.json"), null);
    const prev = lib.readJson(
      join(lib.RESULTS_DIR, "classifications.json"),
      null
    );
    if (!r1) {
      console.log("no rater 1 labels; classifications.json left as it is");
      return;
    }
    const sub = blindSubset(sample);
    const out = {
      codebook: "See the header of func-style-sample.cjs.",
      generated: new Date().toISOString(),
      raters: {
        rater1:
          "the Claude model that ran the measurements, with the worksheets (which show the automatic label)",
        rater2:
          "a separate Claude subagent, blind: the worksheet blocks without any automatic label, and the codebook",
      },
      rater1: r1,
      rater2: r2 ?? prev?.rater2 ?? null,
      subset: sub,
    };
    const shares = (items, field, weight = () => 1) => {
      const tot = {};
      let all = 0;
      for (const it of items) {
        const v = r1[it.id]?.[field];
        if (v === undefined) {
          continue;
        }
        const w = weight(it);
        tot[v] = (tot[v] ?? 0) + w;
        all += w;
      }
      return Object.fromEntries(
        Object.entries(tot)
          .map(([k, v]) => [k, Math.round((v / all) * 1000) / 10])
          .sort((a, b) => b[1] - a[1])
      );
    };
    const random = sample.F.filter((x) => x.stratum === "random");
    const fw = (it) => (sample.populations.F[it.repo] ?? 0) / PER_REPO;
    out.shares = {
      F: {
        conversion: shares(random, "conversion", fw),
        reads: shares(random, "reads", fw),
        concise: shares(random, "concise", fw),
        conversionUnweighted: shares(random, "conversion"),
        byStratum: Object.fromEntries(
          [...new Set(sample.F.map((x) => x.stratum))].map((s) => [
            s,
            {
              conversion: shares(
                sample.F.filter((x) => x.stratum === s),
                "conversion"
              ),
              n: sample.F.filter((x) => x.stratum === s).length,
              reads: shares(
                sample.F.filter((x) => x.stratum === s),
                "reads"
              ),
            },
          ])
        ),
      },
      U: {
        byStratum: Object.fromEntries(
          [...new Set(sample.U.map((x) => x.stratum))].map((s) => [
            s,
            {
              n: sample.U.filter((x) => x.stratum === s).length,
              order: shares(
                sample.U.filter((x) => x.stratum === s),
                "order"
              ),
              runtime: shares(
                sample.U.filter((x) => x.stratum === s),
                "runtime"
              ),
            },
          ])
        ),
        // weighted by each stratum's population among Oxlint's reports
        runtime: shares(
          sample.U,
          "runtime",
          (it) => (sample.populations.U[it.stratum] ?? 0) / U_QUOTAS[it.stratum]
        ),
        order: shares(
          sample.U,
          "order",
          (it) => (sample.populations.U[it.stratum] ?? 0) / U_QUOTAS[it.stratum]
        ),
      },
    };
    const agree = (ids, field) => {
      const pairs = ids
        .filter(
          (id) =>
            r1[id]?.[field] !== undefined &&
            out.rater2?.[id]?.[field] !== undefined
        )
        .map((id) => [r1[id][field], out.rater2[id][field]]);
      return {
        kappa: kappa(pairs),
        n: pairs.length,
        same: pairs.filter(([a, b]) => a === b).length,
      };
    };
    if (out.rater2) {
      out.agreement = {
        F: {
          concise: agree(sub.F, "concise"),
          conversion: agree(sub.F, "conversion"),
          reads: agree(sub.F, "reads"),
        },
        U: { order: agree(sub.U, "order"), runtime: agree(sub.U, "runtime") },
      };
    }
    // rater 1 against the automatic labels
    const autoF = (id) => {
      const it = sample.F.find((x) => x.id === id);
      const c = conversionOf(fnOf(it));
      return c === "arrow"
        ? "clean-or-reorder"
        : c.startsWith("function-expression")
          ? "function-expression"
          : "blocked";
    };
    const autoU = (id) => autoRuntime(ubdOf(sample.U.find((x) => x.id === id)));
    const fPairs = sample.F.filter((x) => r1[x.id]).map((x) => [
      ["clean", "reorder"].includes(r1[x.id].conversion)
        ? "clean-or-reorder"
        : r1[x.id].conversion,
      autoF(x.id),
    ]);
    const uPairs = sample.U.filter((x) => r1[x.id]).map((x) => [
      r1[x.id].runtime,
      autoU(x.id),
    ]);
    out.automatic = {
      F: {
        kappa: kappa(fPairs),
        n: fPairs.length,
        same: fPairs.filter(([a, b]) => a === b).length,
      },
      U: {
        kappa: kappa(uPairs),
        n: uPairs.length,
        same: uPairs.filter(([a, b]) => a === b).length,
      },
      disagreementsU: sample.U.filter(
        (x) => r1[x.id] && r1[x.id].runtime !== autoU(x.id)
      ).map((x) => ({ auto: autoU(x.id), id: x.id, rater1: r1[x.id].runtime })),
      disagreementsF: sample.F.filter((x) => r1[x.id])
        .filter((x) => {
          const a = ["clean", "reorder"].includes(r1[x.id].conversion)
            ? "clean-or-reorder"
            : r1[x.id].conversion;
          return a !== autoF(x.id);
        })
        .map((x) => ({
          auto: autoF(x.id),
          id: x.id,
          rater1: r1[x.id].conversion,
        })),
    };
    lib.writeJson(join(lib.RESULTS_DIR, "classifications.json"), out);
    console.log(
      JSON.stringify(
        {
          agreement: out.agreement,
          automatic: { F: out.automatic.F, U: out.automatic.U },
          shares: out.shares.F.conversion,
          U: out.shares.U.runtime,
        },
        null,
        1
      )
    );
  }
};

main();
