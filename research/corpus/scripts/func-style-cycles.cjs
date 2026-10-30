// Module cycles and conversion: in a runtime import cycle, a module can read another module's
// export while that module is still evaluating. A function declaration is initialised when its
// module is instantiated, so calling it then works (unless its body reads module state that isn't
// ready); a `const` isn't initialised until its line runs, so the same read throws.
//
// This reuses the import-cycles topic's graph (import-cycles-graph.cjs `analyse`: one TypeScript
// program per repo, runtime edges, and every top-level read of an imported binding along a
// runtime cycle, with the binding's kind and whether the read is TDZ-prone), with every read
// listed rather than the first 3 per edge the import-cycles output keeps. For each
// runtime cycle it counts the top-level reads that are safe today only because the binding is a
// function declaration that reads no module state (`binding: "function", risky: false`), and the
// indirect reads through local callables whose imported bindings are all such functions. Those
// become TDZ-prone once the declarations are converted to `const` functions.
//
// Usage: node --max-old-space-size=16384 research/corpus/scripts/func-style-cycles.cjs [--repos a,b]
// Writes results/func-style/cycles.json.
"use strict";

const { rmSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./func-style-lib.cjs");
const ic = require("./import-cycles-lib.cjs");
const { analyse } = require("./import-cycles-graph.cjs");

const main = () => {
  const names = lib.selectedRepos(Object.keys(ic.SETUP));
  lib.checkPinned(names);
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of func-style-cycles.cjs. A cycle `flips` when it's late-use today (no TDZ-prone top-level read) and has at least one top-level or indirect read of a function declaration, which becomes TDZ-prone after conversion. Reads are the graph's, every one of them (the import-cycles output lists at most 3 per edge); each row shows the first 6.",
    repos: {},
    tools: lib.toolVersions(),
  };
  for (const name of names) {
    const t0 = Date.now();
    const { detail, summary } = analyse(name, { usageLimit: Infinity });
    const cycles = detail.cycles ?? [];
    const rows = [];
    for (const c of cycles) {
      const hoisted = [];
      for (const e of c.edges) {
        const u = e.usage;
        if (!u) {
          continue;
        }
        for (const t of u.topLevel ?? []) {
          if (t.binding === "function" && !t.risky) {
            hoisted.push({
              from: e.from,
              kind: "top-level",
              line: t.line,
              name: t.name,
              text: t.text,
              to: e.to,
            });
          }
        }
        for (const t of u.indirect ?? []) {
          if (!t.risky) {
            hoisted.push({
              from: e.from,
              kind: "indirect",
              line: t.line,
              name: t.name,
              text: t.text,
              to: e.to,
            });
          }
        }
      }
      rows.push({
        files: c.files.length,
        flips: c.risk === "late-use" && hoisted.length > 0,
        hoisted: hoisted.slice(0, 6),
        hoistedReads: hoisted.length,
        id: c.id,
        risk: c.risk,
      });
    }
    result.repos[name] = {
      cycles: rows.length,
      byRisk: rows.reduce((o, r) => {
        o[r.risk] = (o[r.risk] ?? 0) + 1;
        return o;
      }, {}),
      flips: rows.filter((r) => r.flips).length,
      hoistedReads: rows.reduce((s, r) => s + r.hoistedReads, 0),
      oxlintNoCycle: summary.oxlint?.noCycle ?? null,
      rows: rows
        .filter((r) => r.hoistedReads > 0)
        .map((r) => ({
          ...r,
          hoisted: r.hoisted.map((h) => ({
            ...h,
            permalink: lib.permalink(name, h.from, h.line),
          })),
        })),
      seconds: Math.round((Date.now() - t0) / 1000),
      sha: lib.shaOf(name),
    };
    const s = result.repos[name];
    console.log(
      `${name}: ${s.cycles} runtime cycles ${JSON.stringify(s.byRisk)}; flips ${s.flips}; hoisted reads ${s.hoistedReads} (${s.seconds}s)`
    );
  }
  const all = Object.values(result.repos);
  result.pooled = {
    cycles: all.reduce((s, r) => s + r.cycles, 0),
    flips: all.reduce((s, r) => s + r.flips, 0),
    hoistedReads: all.reduce((s, r) => s + r.hoistedReads, 0),
    lateUse: all.reduce((s, r) => s + (r.byRisk["late-use"] ?? 0), 0),
    topLevelUse: all.reduce((s, r) => s + (r.byRisk["top-level-use"] ?? 0), 0),
  };
  lib.writeJson(join(lib.RESULTS_DIR, "cycles.json"), result);
  // the import-cycles graph writes Ultracite's Oxlint root config under its own out/ folder
  rmSync(join(ic.OUT_DIR, "configs"), { force: true, recursive: true });
};

main();
