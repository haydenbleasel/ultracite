// The hand classification: a stratified sample of 100 functions over max-lines-per-function's
// default (50 lines; source files of the twelve external repos, IIFEs excluded) and 30 over
// max-params 4 (five or more parameters), with worksheets for two raters.
//
//   --worksheet  draws the samples (seeded; frozen in sample.json, reused unless --resample) and
//                writes out/length-limits/worksheet-long.md and worksheet-params.md: each function's
//                code (up to 220 lines; the rest is in the clone at the given path), its metrics,
//                its shape, and for parameter lists the parameters with their types, whether the
//                function is exported and how many call sites its name has in the repo
//   --print      writes the blind subsets for the second rater (worksheet-*-blind.md): 30 long
//                functions and 10 parameter lists, seeded, the same blocks without any labels
//   --compute    reads out/length-limits/labels-*.json and writes classifications.json: both raters,
//                shares weighted to the population by repo and stratum, agreement and Cohen's kappa
//
// Strata: long functions by repo (proportional, at least 3 per repo with that many) and, within a
// repo, by shape (component, dispatch, data, mostly nested, other; proportional); at most one
// function per file. Parameter lists by repo (proportional, at least 1).
//
// Usage: node research/corpus/scripts/length-sample.cjs --worksheet --print | --compute
"use strict";

const { join } = require("node:path");

const lib = require("./length-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const SEED = 20261025;
const N_LONG = 100;
const N_PARAMS = 30;
const N_BLIND_LONG = 30;
const N_BLIND_PARAMS = 10;
const MAX_CODE_LINES = 220;
const EXTERNAL = [...lib.CORE, ...lib.REACT];

const shapeOf = (f) => {
  const own = Math.max(1, f.lines - f.nestedLines);
  if (f.component) {
    return "component";
  }
  if (f.own.switchCasesMax >= 8 || f.own.ifChainMax >= 8) {
    return "dispatch";
  }
  if (f.dataLines / own >= 0.5) {
    return "data";
  }
  if (f.nestedLines / f.lines >= 0.5) {
    return "nested";
  }
  return "other";
};

const allocate = (counts, total, min) => {
  const sum = Object.values(counts).reduce((s, n) => s + n, 0);
  const out = {};
  for (const [k, n] of Object.entries(counts)) {
    out[k] = Math.min(n, Math.max(min, Math.round((n / sum) * total)));
  }
  // adjust to the total, largest strata first
  let diff = total - Object.values(out).reduce((s, n) => s + n, 0);
  const keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  for (let i = 0; diff !== 0 && i < 1000; i++) {
    const k = keys[i % keys.length];
    if (diff > 0 && out[k] < counts[k]) {
      out[k]++;
      diff--;
    } else if (diff < 0 && out[k] > min) {
      out[k]--;
      diff++;
    }
  }
  return out;
};

const draw = () => {
  const random = lib.rng(SEED);
  const pop = { long: [], params: [] };
  for (const name of EXTERNAL) {
    for (const f of lib.readJsonl(join(CENSUS, `${name}.functions.jsonl`))) {
      if (f.test) {
        continue;
      }
      if (!f.iife && f.lines > 50) {
        pop.long.push({ ...f, shape: shapeOf(f) });
      }
      if (f.paramsEslint > 4) {
        pop.params.push(f);
      }
    }
  }
  const perRepo = (xs) => lib.countBy(xs, (f) => f.repo);
  // long functions
  const longAlloc = allocate(perRepo(pop.long), N_LONG, 3);
  const long = [];
  const strataPopulation = {};
  for (const [repo, n] of Object.entries(longAlloc)) {
    const xs = pop.long.filter((f) => f.repo === repo);
    const shapes = lib.countBy(xs, (f) => f.shape);
    const alloc = allocate(shapes, n, 0);
    for (const [shape, k] of Object.entries(alloc)) {
      strataPopulation[`${repo}|${shape}`] = shapes[shape];
      const files = new Set(long.map((f) => `${f.repo}:${f.file}`));
      const pool = lib.shuffle(
        xs.filter((f) => f.shape === shape),
        random
      );
      const picked = [];
      for (const f of pool) {
        if (picked.length >= k) {
          break;
        }
        if (files.has(`${f.repo}:${f.file}`)) {
          continue;
        }
        files.add(`${f.repo}:${f.file}`);
        picked.push(f);
      }
      // a stratum with fewer distinct files than its quota: allow a second per file
      for (const f of pool) {
        if (picked.length >= k) {
          break;
        }
        if (!picked.includes(f)) {
          picked.push(f);
        }
      }
      for (const f of picked) {
        long.push({ ...f, stratum: `${repo}|${shape}` });
      }
    }
  }
  const paramsAlloc = allocate(perRepo(pop.params), N_PARAMS, 1);
  const params = [];
  const paramStrata = {};
  for (const [repo, n] of Object.entries(paramsAlloc)) {
    const xs = pop.params.filter((f) => f.repo === repo);
    paramStrata[repo] = xs.length;
    for (const f of lib.shuffle(xs, random).slice(0, n)) {
      params.push({ ...f, stratum: repo });
    }
  }
  const ids = (xs, prefix) =>
    xs
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((f, i) => ({
        fn: f.id,
        id: `${prefix}${String(i + 1).padStart(3, "0")}`,
        stratum: f.stratum,
      }));
  const longItems = ids(long, "L");
  const paramItems = ids(params, "P");
  const blindLong = lib
    .shuffle(
      longItems.map((x) => x.id),
      lib.rng(SEED + 1)
    )
    .slice(0, N_BLIND_LONG)
    .sort();
  const blindParams = lib
    .shuffle(
      paramItems.map((x) => x.id),
      lib.rng(SEED + 2)
    )
    .slice(0, N_BLIND_PARAMS)
    .sort();
  return {
    blind: { long: blindLong, params: blindParams },
    generated: new Date().toISOString(),
    long: longItems,
    params: paramItems,
    population: {
      long: pop.long.length,
      longByRepo: perRepo(pop.long),
      longByShape: lib.countBy(pop.long, (f) => f.shape),
      params: pop.params.length,
      paramsByRepo: perRepo(pop.params),
    },
    seed: SEED,
    strataPopulation: { long: strataPopulation, params: paramStrata },
  };
};

const CODEBOOK_LONG = `## Codebook (long functions)

Label each function with a JSON object: \`{ "id": "L001", "whyLong": ..., "readsEndToEnd": ..., "splitHelps": ..., "splitPoints": ..., "splitCost": [...], "hardOtherwise": ..., "note": ... }\`.

- **whyLong** (the one reason that accounts for most of its length):
  - \`dispatch\`: a flat \`switch\` or if/else chain choosing one of many independent branches
  - \`data\`: data or a config table (object or array literals, a schema, a list of entries)
  - \`markup\`: JSX markup
  - \`sequence\`: sequential steps of one task, read top to bottom
  - \`several\`: several separable tasks in one function
  - \`errors\`: error handling (validation, try/catch, fallbacks) dominates
  - \`setup\`: setup or wiring (registering handlers, building a plugin or object of closures, test-like setup)
  - \`nested\`: most of its length is functions it defines (a factory, a hook or a class-like closure)
  - \`generated\`: generated or mechanical code
- **readsEndToEnd**: can a reader follow it end to end as written, top to bottom, without jumping around or holding much in mind? \`yes\`, \`partly\`, \`no\`
- **splitHelps**: would splitting it help a reader? \`yes\`, \`partly\` (one or two extractions would), \`no\`
- **splitPoints**: where the natural split points are (line ranges or a short description), or \`null\`
- **splitCost**: what splitting would cost, a list of any of \`none\`, \`many-params\` (helpers would need many parameters), \`shared-state\` (pieces share mutable locals, or depend on order or early returns), \`jumping\` (the reader would jump between functions to follow one flow), \`api-change\` (a public signature or a framework's contract would change), \`other\`
- **hardOtherwise**: is it hard to read for reasons length doesn't capture? \`none\`, \`naming\`, \`state\` (mutable state, aliasing), \`control-flow\` (nesting, early exits, async), \`types\`, \`domain\` (needs domain knowledge), \`other\`
- **note**: one sentence

Read the code where it is (the clone path is given; read-only). Never run anything.
`;
const CODEBOOK_PARAMS = `## Codebook (parameter lists)

Label each function with \`{ "id": "P001", "swappable": ..., "optionsObjectHelps": ..., "signature": ..., "note": ... }\`.

- **swappable**: are there two or more parameters of the same type next to each other, so a caller could pass them in the wrong order without a type error (Rice et al.'s argument selection defects)? \`yes\`, \`partly\` (some, but the names or types make a swap unlikely), \`no\`
- **optionsObjectHelps**: would an options object (named parameters) help callers? \`yes\`, \`no\`, \`already\` (it already takes one, or most parameters are already one object)
- **signature**: who decides this signature? \`public-api\` (exported and used by other packages or users), \`framework\` (a callback, handler, override or interface implementation whose parameters someone else fixed), \`internal\` (only this package calls it)
- **note**: one sentence
`;

const fnText = (repo, f) => {
  const text = lib.readFileSync(join(lib.getRepo(repo).root, f.file), "utf8");
  return text.split("\n").slice(f.embedStartLine - 1, f.endLine);
};

const callSites = (() => {
  const cache = new Map();
  return (repo, name) => {
    const bare = name?.split(".").at(-1);
    if (!bare || !/^[A-Za-z_$][\w$]*$/.test(bare) || bare === "constructor") {
      return null;
    }
    const key = `${repo}:${bare}`;
    if (cache.has(key)) {
      return cache.get(key);
    }
    const root = lib.getRepo(repo).root;
    const re = new RegExp(
      `(?<![\\w$.])${bare.replace(/\$/g, "\\$")}\\s*\\(|\\.${bare.replace(/\$/g, "\\$")}\\s*\\(`,
      "g"
    );
    let n = 0;
    for (const { rel } of lib.filesOf(repo)) {
      n += (lib.readFileSync(join(root, rel), "utf8").match(re) ?? []).length;
    }
    cache.set(key, Math.max(0, n - 1));
    return cache.get(key);
  };
})();

const block = (item, f, kind) => {
  const lines = fnText(f.repo, f);
  const shown = lines.slice(0, MAX_CODE_LINES);
  const out = [
    `### ${item.id} ${f.repo} \`${f.name}\``,
    "",
    `- Where: \`${lib.getRepo(f.repo).root.replace(lib.ULTRACITE, ".")}/${f.file}\` lines ${f.embedStartLine}-${f.endLine} ([permalink](${lib.permalink(f.repo, f.file, f.embedStartLine, f.endLine)}))`,
    `- Kind: ${f.kind}${f.callee ? ` (passed to \`${f.callee}\`)` : ""}; ${f.depth === 0 ? "top level" : `nested ${f.depth} deep`}`,
    `- Lines ${f.lines} (code ${f.linesCode}, JSX ${f.jsxLines}, in nested functions ${f.nestedLines}, data literals ${f.dataLines}), statements ${f.statements}, parameters ${f.paramsEslint}, block depth ${f.maxDepth}, cognitive complexity ${f.cognitive}`,
  ];
  if (kind === "params") {
    const text = lib.readFileSync(
      join(lib.getRepo(f.repo).root, f.file),
      "utf8"
    );
    const head = text.slice(f.paramsStart, f.paramsStart + 1200);
    out.push(
      `- Exported: ${/\bexport\b/.test(text.slice(Math.max(0, f.ownerStart - 200), f.ownerStart + 40)) ? "yes (or in an exported declaration)" : "not directly"}; call sites of \`${f.name.split(".").at(-1)}(\` in the repo's measured files: ${callSites(f.repo, f.name) ?? "n/a"}`,
      `- Parameter list: \`${head
        .slice(0, head.indexOf(")") + 1 || 300)
        .replace(/\s+/g, " ")
        .slice(0, 400)}\``
    );
  }
  out.push(
    "",
    "```ts",
    ...shown,
    ...(lines.length > shown.length
      ? [
          `// … ${lines.length - shown.length} more lines (read them in the clone)`,
        ]
      : []),
    "```",
    ""
  );
  return out.join("\n");
};

const writeWorksheets = (sample, blind) => {
  const fns = new Map();
  for (const name of EXTERNAL) {
    for (const f of lib.readJsonl(join(CENSUS, `${name}.functions.jsonl`))) {
      fns.set(f.id, f);
    }
  }
  const heading = (title, codebook, n) =>
    `# Hand classification: ${title}\n\n${n} functions from the length-limits sample (seed ${SEED}). Return a JSON array with one object per id.\n\n${codebook}\n## Items\n\n`;
  const longItems = blind
    ? sample.long.filter((x) => sample.blind.long.includes(x.id))
    : sample.long;
  const paramItems = blind
    ? sample.params.filter((x) => sample.blind.params.includes(x.id))
    : sample.params;
  const suffix = blind ? "-blind" : "";
  lib.writeFileSync(
    join(lib.OUT_DIR, `worksheet-long${suffix}.md`),
    heading("long functions", CODEBOOK_LONG, longItems.length) +
      longItems.map((it) => block(it, fns.get(it.fn), "long")).join("\n")
  );
  lib.writeFileSync(
    join(lib.OUT_DIR, `worksheet-params${suffix}.md`),
    heading("parameter lists", CODEBOOK_PARAMS, paramItems.length) +
      paramItems.map((it) => block(it, fns.get(it.fn), "params")).join("\n")
  );
  console.log(
    `worksheets${suffix}: ${longItems.length} long, ${paramItems.length} params`
  );
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

const compute = (sample) => {
  const read = (f) => {
    const p = join(lib.OUT_DIR, f);
    if (!lib.existsSync(p)) {
      return {};
    }
    return Object.fromEntries(lib.readJson(p).map((x) => [x.id, x]));
  };
  if (!lib.existsSync(join(lib.OUT_DIR, "labels-long-r1.json"))) {
    console.log(
      "no rater labels in out/length-limits (labels-*.json): classifications.json is kept as it is"
    );
    return;
  }
  const r1 = {
    ...read("labels-long-r1.json"),
    ...read("labels-params-r1.json"),
  };
  const r2 = {
    ...read("labels-long-r2.json"),
    ...read("labels-params-r2.json"),
  };
  const items = [...sample.long, ...sample.params];
  const missing = items.filter((it) => !r1[it.id]).map((it) => it.id);
  // shares weighted to the population by stratum
  const weighted = (list, strataPop, field) => {
    const byStratum = new Map();
    for (const it of list) {
      if (!r1[it.id]) {
        continue;
      }
      if (!byStratum.has(it.stratum)) {
        byStratum.set(it.stratum, []);
      }
      byStratum.get(it.stratum).push(r1[it.id]);
    }
    const totals = {};
    let pop = 0;
    for (const [stratum, labels] of byStratum) {
      const w = (strataPop[stratum] ?? 0) / labels.length;
      pop += strataPop[stratum] ?? 0;
      for (const l of labels) {
        const values = Array.isArray(l[field]) ? l[field] : [l[field]];
        for (const v of values) {
          totals[v] = (totals[v] ?? 0) + w;
        }
      }
    }
    return Object.fromEntries(
      Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, Math.round((v / pop) * 1000) / 10])
    );
  };
  const raw = (list, field) =>
    lib.countBy(
      list
        .filter((it) => r1[it.id])
        .flatMap((it) => {
          const v = r1[it.id][field];
          return Array.isArray(v) ? v : [v];
        }),
      (v) => v
    );
  const agreement = (list, blindIds, fields) => {
    const out = {};
    for (const field of fields) {
      const pairs = blindIds
        .filter((id) => r1[id] && r2[id])
        .map((id) => {
          const norm = (v) =>
            Array.isArray(v) ? [...v].sort().join("+") : String(v);
          return [norm(r1[id][field]), norm(r2[id][field])];
        });
      out[field] = {
        kappa: kappa(pairs),
        n: pairs.length,
        same: pairs.filter(([a, b]) => a === b).length,
      };
    }
    return out;
  };
  const longFields = [
    "whyLong",
    "readsEndToEnd",
    "splitHelps",
    "splitCost",
    "hardOtherwise",
  ];
  const paramFields = ["swappable", "optionsObjectHelps", "signature"];
  // splitCost as a set is strict; also agreement on "has a cost other than none"
  const costAny = (l) =>
    (l?.splitCost ?? []).some((c) => c !== "none") ? "cost" : "none";
  const costPairs = sample.blind.long
    .filter((id) => r1[id] && r2[id])
    .map((id) => [costAny(r1[id]), costAny(r2[id])]);
  const fns = new Map();
  for (const name of EXTERNAL) {
    for (const f of lib.readJsonl(join(CENSUS, `${name}.functions.jsonl`))) {
      fns.set(f.id, f);
    }
  }
  const crossTab = (list, a, b) =>
    lib.countBy(
      list
        .filter((it) => r1[it.id])
        .map((it) => `${r1[it.id][a]} / ${r1[it.id][b]}`),
      (x) => x
    );
  lib.writeJson(join(lib.RESULTS_DIR, "classifications.json"), {
    agreement: {
      long: {
        ...agreement(sample.long, sample.blind.long, longFields),
        splitCostAny: {
          kappa: kappa(costPairs),
          n: costPairs.length,
          same: costPairs.filter(([x, y]) => x === y).length,
        },
      },
      params: agreement(sample.params, sample.blind.params, paramFields),
    },
    codebook: { long: CODEBOOK_LONG, params: CODEBOOK_PARAMS },
    crossTabs: {
      readsEndToEndBySplitHelps: crossTab(
        sample.long,
        "readsEndToEnd",
        "splitHelps"
      ),
      whyLongBySplitHelps: crossTab(sample.long, "whyLong", "splitHelps"),
      swappableBySignature: crossTab(sample.params, "swappable", "signature"),
    },
    generated: new Date().toISOString(),
    items: items.map((it) => {
      const f = fns.get(it.fn);
      return {
        ...it,
        cognitive: f.cognitive,
        lines: f.lines,
        name: f.name,
        params: f.paramsEslint,
        permalink: lib.permalink(f.repo, f.file, f.embedStartLine, f.endLine),
        rater1: r1[it.id] ?? null,
        rater2: r2[it.id] ?? null,
        repo: f.repo,
        statements: f.statements,
      };
    }),
    missing,
    note: "Rater 1 (a Claude subagent with read-only access to the clones) labelled every item; rater 2 (a separate Claude subagent, blind to rater 1) labelled the seeded subsets in sample.json `blind`. Both raters are Claude models, so agreement measures how consistently the codebook applies, not independent human judgement. `weighted` shares are weighted to the population (functions over 50 lines, or with five or more parameters, in the twelve repos' source) by stratum; `raw` are the sample's own counts. splitCost is a set: its kappa compares whole sets, and splitCostAny compares 'any cost' against 'none'.",
    raw: {
      long: Object.fromEntries(longFields.map((f) => [f, raw(sample.long, f)])),
      params: Object.fromEntries(
        paramFields.map((f) => [f, raw(sample.params, f)])
      ),
    },
    weighted: {
      long: Object.fromEntries(
        longFields.map((f) => [
          f,
          weighted(sample.long, sample.strataPopulation.long, f),
        ])
      ),
      params: Object.fromEntries(
        paramFields.map((f) => [
          f,
          weighted(sample.params, sample.strataPopulation.params, f),
        ])
      ),
    },
  });
  console.log(
    `classifications: ${items.length - missing.length}/${items.length} labelled by rater 1, ${Object.keys(r2).length} by rater 2`
  );
};

const main = () => {
  const file = join(lib.RESULTS_DIR, "sample.json");
  let sample = lib.readJson(file);
  if (!sample || lib.flag("resample")) {
    sample = draw();
    lib.writeJson(file, sample);
  }
  if (lib.flag("worksheet")) {
    writeWorksheets(sample, false);
  }
  if (lib.flag("print")) {
    writeWorksheets(sample, true);
  }
  if (lib.flag("compute")) {
    compute(sample);
  }
};

main();
