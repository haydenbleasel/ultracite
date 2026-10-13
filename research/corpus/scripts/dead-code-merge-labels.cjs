// Assembles results/dead-code/classifications.json from the hand classification passes: the
// first rater's labels per kind (out/dead-code/labels-<kind>.json) and the blind second rater's
// subset (out/dead-code/labels-second.json), with the codebooks. Then computes shares per kind,
// unweighted and weighted by each repo's population (sample.json `populations`).
//
// Usage (from the repo root):
//   node research/corpus/scripts/dead-code-merge-labels.cjs
//   node research/corpus/scripts/dead-code-sample.cjs --compute     # agreement
"use strict";

const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./dead-code-lib.cjs");

const CODEBOOK = {
  clone: {
    accidental:
      "copy-paste that should be shared; a maintainer would accept extracting a helper",
    deliberate:
      "kept on purpose: platform/runtime variants, data tables, versioned copies, decoupling across boundaries, performance, parallel structure (one file per locale or adapter)",
    inconsistent:
      "the copies differ in a way that looks like a fix, guard or behavior applied to one copy only: a likely bug",
    trivial: "tiny or idiomatic repetition not worth sharing",
    unclear: "can't tell",
  },
  "dead-store": {
    "debug-wip": "debug scaffolding or work in progress",
    bug: "the lost value should have been used; concrete consequence",
    "false-positive": "the value is read (closures, try/finally, loops)",
    intentional:
      "deliberate: clearing a reference for GC, readability/narrowing initializer, documented defensive reset",
    leftover:
      "harmless redundancy, safe to delete: an initializer always overwritten, a redundant reset",
    unclear: "can't tell",
  },
  export: {
    "analysis-miss": "a static reference exists that the analysis missed",
    dead: "nothing uses it and it isn't public; deletable",
    dynamic:
      "used by name at runtime (registry, string-keyed lookup, virtual module)",
    "public-api":
      "public surface: documented, re-exported, module augmentation, deliberate wildcard subpath",
    "test-or-tooling": "used only by tests, scripts, build config or docs",
    unclear: "can't tell",
    "unnecessary-export":
      "declaration live in its own file or via a side effect (self-registration); only `export` is unneeded",
  },
  unused: {
    "debug-wip": "debug scaffolding or work in progress",
    bug: "the value was computed or received and should have been used (wrong variable, typo, lost result, ignored option); concrete runtime consequence",
    "false-positive": "the name is actually used",
    intentional:
      "signature placeholder, interface-conformance or API-compat parameter, destructuring omit, `_` convention, type-level trick, catch binding kept by style",
    leftover: "dead code, safe to delete",
    unclear: "can't tell",
  },
};

const main = () => {
  const sample = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "sample.json"), "utf8")
  );
  const byId = new Map(sample.sites.map((s) => [s.id, s]));
  const labels = [];
  const missing = [];
  for (const kind of sample.kinds) {
    const path = join(lib.OUT_DIR, `labels-${kind}.json`);
    if (!existsSync(path)) {
      missing.push(kind);
      continue;
    }
    const data = JSON.parse(readFileSync(path, "utf8"));
    const ids = new Set(
      sample.sites.filter((s) => s.kind === kind).map((s) => s.id)
    );
    for (const l of data.labels) {
      if (!ids.has(l.id)) {
        throw new Error(`${kind}: unknown id ${l.id}`);
      }
      if (!(l.category in CODEBOOK[kind])) {
        throw new Error(
          `${kind}: ${l.id} has category ${l.category} outside the codebook`
        );
      }
      const site = byId.get(l.id);
      labels.push({ kind, permalink: site.permalink, repo: site.repo, ...l });
      ids.delete(l.id);
    }
    if (ids.size > 0) {
      throw new Error(`${kind}: no label for ${[...ids].join(", ")}`);
    }
  }
  const secondPath = join(lib.OUT_DIR, "labels-second.json");
  const secondRater = {};
  if (existsSync(secondPath)) {
    for (const l of JSON.parse(readFileSync(secondPath, "utf8")).labels) {
      secondRater[l.id] = { category: l.category, note: l.note };
    }
  }
  // shares: unweighted, and weighted by each repo's population of that kind
  const shares = {};
  for (const kind of sample.kinds) {
    const rows = labels.filter((l) => l.kind === kind);
    if (rows.length === 0) {
      continue;
    }
    const cats = Object.keys(CODEBOOK[kind]);
    const unweighted = Object.fromEntries(
      cats.map((c) => [c, rows.filter((r) => r.category === c).length])
    );
    const weighted = Object.fromEntries(cats.map((c) => [c, 0]));
    let totalPop = 0;
    for (const repo of lib.EXTERNAL) {
      const inRepo = rows.filter((r) => r.repo === repo);
      const pop = sample.populations[repo]?.[kind] ?? 0;
      if (inRepo.length === 0 || pop === 0) {
        continue;
      }
      totalPop += pop;
      for (const c of cats) {
        weighted[c] +=
          (inRepo.filter((r) => r.category === c).length / inRepo.length) * pop;
      }
    }
    shares[kind] = {
      n: rows.length,
      unweighted,
      unweightedPct: Object.fromEntries(
        cats.map((c) => [c, lib.pct(unweighted[c], rows.length)])
      ),
      weightedPct: Object.fromEntries(
        cats.map((c) => [
          c,
          totalPop ? Math.round((weighted[c] / totalPop) * 1000) / 10 : null,
        ])
      ),
    };
  }
  const path = join(lib.RESULTS_DIR, "classifications.json");
  const previous = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : {};
  const out = {
    ...previous,
    codebook: CODEBOOK,
    generated: new Date().toISOString().slice(0, 10),
    labels,
    method:
      "First pass: one Claude subagent per kind classified every sampled site from the worksheets (out/dead-code/worksheet-<kind>.md) and the repo files, read-only. Second pass: a separate Claude subagent labelled a seeded subset of 20 per kind (dead-code-sample.cjs --print, seed 7) blind, without access to the first pass. Both raters are Claude models, so agreement measures how consistently the codebook applies, not human judgment.",
    missingKinds: missing,
    secondRater,
    shares,
  };
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify(shares, null, 1));
  if (missing.length) {
    console.log("missing:", missing);
  }
};

main();
