// The hand classification of reported nested ternaries.
//
//   --worksheet  draws the seeded sample (frozen in results/nested-ternaries/sample.json;
//                --resample draws again): 80 nested ternaries ESLint's no-nested-ternary reports
//                (source, the twelve external repos), stratified so every kind of position gets
//                read, with repos taken round-robin inside each stratum:
//                  D  12  one discriminant compared with constants (lookup or switch shape)
//                  E  14  early-return positions (a return, an arrow's concise body)
//                  S  16  statement positions (an initializer, an assignment or expression
//                         statement)
//                  J  20  other positions inside JSX (children, attributes, props)
//                  X  18  other positions outside JSX (properties, arguments, templates, …)
//                and writes out/nested-ternaries/worksheet.md (with the census's automatic labels,
//                for rater 1) and worksheet-blind.md (without them)
//   --print      the blind subset for the second rater (36, seeded), without any label
//   --compute    reads out/nested-ternaries/labels-rater1.json and labels-rater2.json and writes
//                results/nested-ternaries/classifications.json: both raters, shares weighted by
//                each stratum's population, agreement and Cohen's kappa
//                (classification-agreement.cjs's formula), and rater 1 against the census's
//                automatic labels
//
// Codebook (both raters):
//   structure    flat-chain (reads as one list of conditions tried in order: every nested ternary
//                in the alternate) | nested (a decision inside a decision: a ternary in a
//                consequent or a test)
//   reads        better | same | worse: the rewrite chosen below (or, for keep, the best statement
//                rewrite) against the ternary as written
//   rewrite      early-return | if-else (let plus if/else, or if/else statements) | helper (a
//                function or variable above) | lookup (an object or Map) | switch |
//                component-split (JSX: an early return in the component or a child component) |
//                keep (the ternary is the clearest form here)
//   lookupSafe   yes (a lookup would behave the same for every value that reaches it) | no (it
//                would evaluate a call or a read that can throw, change a nullish branch, or match
//                an inherited key) | n/a (the tests don't compare one value with constants)
//   notes        one line
//
// Usage: node research/corpus/scripts/nested-ternaries-sample.cjs --worksheet | --print | --compute
"use strict";

const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./nested-ternaries-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const SEED = 20_261_111;
const QUOTAS = { D: 12, E: 14, J: 20, S: 16, X: 18 };
const REPOS = [...lib.CORE, ...lib.REACT];
const FIELDS = ["structure", "reads", "rewrite", "lookupSafe"];
const SAMPLE_JSON = join(lib.RESULTS_DIR, "sample.json");

const stratumOf = (t) => {
  if (t.tests?.shape === "lookup" || t.tests?.shape === "switch") {
    return "D";
  }
  if (t.rewrite === "early-return") {
    return "E";
  }
  if (t.rewrite === "let-if" || t.rewrite === "if-statement") {
    return "S";
  }
  return t.inJsx || /^jsx-/.test(t.position) ? "J" : "X";
};
const population = () => {
  const rows = [];
  for (const repo of REPOS) {
    for (const t of lib.readJsonl(join(CENSUS, `${repo}.trees.jsonl`))) {
      if (!t.test && t.slots.consequent + t.slots.alternate > 0) {
        rows.push({ ...t, repo, stratum: stratumOf(t) });
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
      depth: t.depth,
      file: t.file,
      id: `n${String(i + 1).padStart(2, "0")}`,
      inJsx: t.inJsx,
      leafRisks: t.leafRisks,
      line: t.line,
      endLine: t.endLine,
      permalink: lib.permalink(t.repo, t.file, t.line, t.endLine),
      position: t.position,
      repo: t.repo,
      rewrite: t.rewrite,
      shape: t.shape,
      stratum: t.stratum,
      tests: t.tests,
    })),
    note: "See the header of nested-ternaries-sample.cjs. Frozen: reruns rewrite the worksheets from this file; --resample draws again.",
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
const context = (item) => {
  const text = readFileSync(
    join(lib.getRepo(item.repo).root, item.file),
    "utf8"
  ).split("\n");
  const from = Math.max(0, item.line - 9);
  const to = Math.min(text.length, item.endLine + 6);
  return text
    .slice(from, to)
    .map((l, i) => {
      const n = from + i + 1;
      const mark = n >= item.line && n <= item.endLine ? ">" : " ";
      return `${mark}${String(n).padStart(5)}  ${l}`;
    })
    .join("\n");
};
const block = (item, withAuto) =>
  [
    `### ${item.id} — ${item.repo} \`${item.file}\` L${item.line}–${item.endLine}`,
    "",
    item.permalink,
    "",
    ...(withAuto
      ? [
          `Automatic: shape ${item.shape}, depth ${item.depth}, position ${item.position} (${item.rewrite}), ${item.inJsx ? "in JSX" : "not in JSX"}, tests ${item.tests?.shape}${item.tests?.discriminant ? ` on \`${item.tests.discriminant}\`` : ""}, branch risks ${item.leafRisks.join(", ")}`,
          "",
        ]
      : []),
    "```ts",
    context(item),
    "```",
    "",
  ].join("\n");
// The codebook block of this file's header, as the worksheets print it.
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
const worksheet = (sample, items, withAuto, title) =>
  [
    `# ${title}`,
    "",
    "Label each nested ternary (the lines marked `>`) with the codebook below. Write a JSON object keyed by id: { structure, reads, rewrite, lookupSafe, notes }.",
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
    .slice(0, 36)
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
      worksheet(
        sample,
        sample.items,
        true,
        "Nested ternaries: worksheet (rater 1)"
      )
    );
    lib.writeText(
      join(lib.OUT_DIR, "worksheet-blind.md"),
      worksheet(
        sample,
        sample.items,
        false,
        "Nested ternaries: worksheet (blind)"
      )
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
        sample,
        sample.items.filter((i) => ids.has(i.id)),
        false,
        "Nested ternaries: worksheet (rater 2, blind)"
      )
    );
    console.log(
      `rater 2 subset: ${ids.size} items -> out/nested-ternaries/worksheet-rater2.md`
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
    // shares weighted by stratum population
    const weights = Object.fromEntries(
      Object.entries(sample.population).map(([s, n]) => [
        s,
        n / sample.items.filter((i) => i.stratum === s).length,
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
        const xs = sample.items.filter((i) => i.stratum === s);
        byStratum[s][f] = xs.reduce((o, i) => {
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
    // rater 1 against the census: structure vs shape, lookupSafe n/a vs the test shape
    const auto = sample.items.map((i) => ({
      lookup: i.tests?.shape === "lookup" || i.tests?.shape === "switch",
      r1: r1[i.id],
      shape: i.shape,
    }));
    const vsAuto = {
      structure: {
        agree: auto.filter(
          (a) => (a.shape === "chain") === (a.r1.structure === "flat-chain")
        ).length,
        n: auto.length,
      },
      lookupNA: {
        agree: auto.filter((a) => a.lookup === (a.r1.lookupSafe !== "n/a"))
          .length,
        n: auto.length,
      },
    };
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
            rater1: r1[i.id],
            ...(r2?.[i.id] ? { rater2: r2[i.id] } : {}),
            permalink: i.permalink,
            stratum: i.stratum,
          },
        ])
      ),
      note: "Rater 1 labelled all items from the worksheet with the census's automatic labels; rater 2, a separate subagent working blind, labelled the subset. Shares are rater 1's, weighted by each stratum's population (sample.json).",
      shares,
      vsAuto,
      weights,
    });
    console.log(JSON.stringify({ agreement, shares, vsAuto }, null, 1));
  }
};

main();
