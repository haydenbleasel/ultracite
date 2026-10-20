// The populations behind the topic's one-rater hand checks, recomputed from the fix analysis
// (out/sort-keys/fixes/oxlint/*.jsonl), and checked against the verdicts kept in
// results/sort-keys/iteration-check.json and effect-order-check.json (hand inputs):
//
//   iteration     every object Oxlint's fix rewrites in the eight corpus repos whose order the
//                 static analysis saw reach Object.keys / values / entries or for-in
//   effect order  a seeded sample (seed 1019) of 16 of the rewritten objects where two values that
//                 run code swap places
//   inference     rewritten objects where two context-sensitive callbacks swap places, per repo,
//                 next to how well that repo's types resolve (sort-keys-fixes.cjs type-checks every
//                 repo before and after the fix)
//
// The run fails if a listed item has no verdict, or a verdict names an item that isn't listed.
//
// Usage: node research/corpus/scripts/sort-keys-hand-checks.cjs
// Writes the recomputed tallies into both hand-input files, and results/sort-keys/inference-check.json.
"use strict";

const { join } = require("node:path");

const lib = require("./sort-keys-lib.cjs");

const rows = (name) =>
  lib
    .readJsonl(join(lib.OUT_DIR, "fixes", "oxlint", `${name}.jsonl`))
    .filter((o) => o.rewritten);
const key = (repo, file, line) => `${repo} ${file}:${line}`;
const check = (path, listed) => {
  const data = lib.readJson(path);
  const have = new Map(data.items.map((i) => [key(i.repo, i.file, i.line), i]));
  const want = new Set(listed.map(([r, o]) => key(r, o.file, o.line)));
  const missing = [...want].filter(
    (k) => !have.has(k) || have.get(k).verdict === "unreviewed"
  );
  const extra = [...have.keys()].filter((k) => !want.has(k));
  if (missing.length || extra.length) {
    throw new Error(
      `${path}: ${missing.length} listed items without a verdict (${missing.slice(0, 3).join("; ")}), ${extra.length} verdicts for items not listed (${extra.slice(0, 3).join("; ")})`
    );
  }
  data.tally = data.items.reduce(
    (a, x) => ({ ...a, [x.verdict]: (a[x.verdict] ?? 0) + 1 }),
    {}
  );
  data.population = listed.length;
  lib.writeJson(path, data);
  return data.tally;
};

const iterated = lib.CORE.flatMap((r) =>
  rows(r)
    .filter((o) => o.observed.some((l) => /keys|for-in|first-match/.test(l)))
    .map((o) => [r, o])
);
console.log(
  "iteration",
  check(join(lib.RESULTS_DIR, "iteration-check.json"), iterated)
);

const swaps = lib.CORE.flatMap((r) =>
  rows(r)
    .filter((o) => o.signs.effectAndEffect)
    .map((o) => [r, o])
);
const sample = lib.shuffle(swaps, lib.rng(1019)).slice(0, 16);
const effect = lib.readJson(join(lib.RESULTS_DIR, "effect-order-check.json"));
effect.population = swaps.length;
lib.writeJson(join(lib.RESULTS_DIR, "effect-order-check.json"), effect);
console.log(
  "effect order",
  check(join(lib.RESULTS_DIR, "effect-order-check.json"), sample),
  `of ${swaps.length}`
);

const fixes = lib.readJson(join(lib.RESULTS_DIR, "fixes.json"));
const inference = {};
for (const r of lib.CORE) {
  const xs = rows(r).filter((o) => o.signs.contextSensitiveCallbacks);
  const t = fixes.repos[r].typecheck;
  inference[r] = {
    added: {
      biome: t?.biome?.added.length ?? null,
      oxlint: t?.oxlint?.added.length ?? null,
    },
    examples: xs.slice(0, 5).map((o) => ({
      keysAfter: o.keysAfter.slice(0, 10),
      keysBefore: o.keysBefore.slice(0, 10),
      permalink: lib.permalink(r, o.file, o.line),
    })),
    objects: xs.length,
    typecheckBefore: t?.before ?? null,
    unresolvedBefore: t?.beforeUnresolved ?? null,
  };
}
lib.writeJson(join(lib.RESULTS_DIR, "inference-check.json"), {
  generated: new Date().toISOString().slice(0, 10),
  inference,
  note: "Objects Oxlint's fix rewrites where two callbacks with unannotated parameters (context-sensitive, so TypeScript infers them in source order) swap places, in an object passed to a call. Only zod and hono type-check without unresolved imports; elsewhere a generic from an unresolved package is any, and a broken inference can't show.",
});
console.log(
  "inference",
  JSON.stringify(
    Object.fromEntries(
      Object.entries(inference).map(([k, v]) => [
        k,
        `${v.objects} objects, ${v.unresolvedBefore} unresolved, +${v.added.oxlint}`,
      ])
    )
  )
);

// Oxlint's objects that had a fix but weren't rewritten in the one pass: how many sit inside
// another object the same pass rewrote (whose fix overlapped theirs).
const overlap = { insideARewrite: 0, total: 0, underADisable: 0 };
for (const r of lib.CORE) {
  const census = new Map(
    lib
      .readJsonl(join(lib.OUT_DIR, "census", `${r}.jsonl`))
      .map((x) => [`${x.file}:${x.start}`, x])
  );
  const all = lib.readJsonl(join(lib.OUT_DIR, "fixes", "oxlint", `${r}.jsonl`));
  const rewritten = all
    .filter((o) => o.rewritten)
    .map((o) => census.get(`${o.file}:${o.start}`));
  const lint = lib.readJson(join(lib.OUT_DIR, "lint", `${r}.json`));
  const disabled = new Set(
    lint.perObject
      .filter((o) => o.raw.oxlint && !o.reported.oxlint)
      .map((o) => `${o.file}:${o.start}`)
  );
  for (const o of all.filter((x) => x.reported && !x.rewritten && !x.blocker)) {
    overlap.total++;
    const c = census.get(`${o.file}:${o.start}`);
    if (disabled.has(`${o.file}:${o.start}`)) {
      overlap.underADisable++;
    } else if (
      rewritten.some(
        (w) => w.file === c.file && w.start < c.start && w.end >= c.end
      )
    ) {
      overlap.insideARewrite++;
    }
  }
}
const inferencePath = join(lib.RESULTS_DIR, "inference-check.json");
lib.writeJson(inferencePath, {
  ...lib.readJson(inferencePath),
  oxlintNotRewrittenWithAFix: overlap,
});
console.log("oxlint fixable but not rewritten", JSON.stringify(overlap));
