// Hand classification of TODOs, two samples, each with a blind second rater.
//
//   pinned    TODO, FIXME, XXX and @todo markers at the pinned commits, stratified by repo
//             (seed 20261018, one marker per comment, frozen in results/todo-comments/sample.json):
//             zod 1 (all), trpc 6, vite 8, astro 10, excalidraw 14, next.js 40, vscode 10; and the
//             React set separately: supabase 8, radix 3, react-aria 2. hono and shadcn have none.
//   removal   the removals drawn by todo-history.cjs --sample (results/todo-comments/removal-sample.json).
//
//   --worksheet  write out/todo-comments/worksheet-pinned.md (the comment, 12 lines of code either
//                side, the permalink) and reuse the frozen sample (--resample draws again)
//   --print      write out/todo-comments/blind-<kind>.md: a seeded subset (36 pinned, 30 removals)
//                for the second rater, the same context and no labels
//   --compute    read out/todo-comments/labels-<rater>-<kind>.json and write
//                results/todo-comments/classifications.json: both raters' labels, shares (rater 1)
//                and Cohen's kappa per field on the overlap
//
// Usage: node research/corpus/scripts/todo-sample.cjs --worksheet --print
//        node research/corpus/scripts/todo-sample.cjs --compute
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const lib = require("./todo-lib.cjs");

const SEED = 20261018;
const SAMPLE = join(lib.RESULTS_DIR, "sample.json");
const REMOVALS = join(lib.RESULTS_DIR, "removal-sample.json");
const ALLOCATION = {
  astro: 10,
  excalidraw: 14,
  "next.js": 40,
  "react-aria": 2,
  radix: 3,
  supabase: 8,
  trpc: 6,
  vite: 8,
  vscode: 10,
  zod: 1,
};
const BLIND = { pinned: 36, removal: 30 };

const CODEBOOK = {
  pinned: {
    changesBehaviour: {
      no: "doing the task is a refactor, a type, a test, a comment or a log message: the program's observable behaviour stays the same",
      unclear: "can't tell",
      yes: "doing the task changes what the code does at runtime (new handling, a fix, removing a workaround, a different API)",
    },
    deleteLosesInfo: {
      no: "the comment says nothing a maintainer would miss: the task is done, obvious from the code, or too vague to act on",
      yes: "deleting the comment would lose something a maintainer would want: a known bug or limitation, a reason, a condition to wait for, a link, a plan",
    },
    onHold: {
      no: "nothing to wait for: the task could be done now",
      yes: "Maipradit et al.: the comment contains a condition showing the developer is waiting for a certain event or for functionality to be implemented elsewhere (an upstream fix, a release, a dependency or runtime version, a deprecation window, another team's work)",
    },
    resolvableInFile: {
      no: "the task needs changes in other files, other packages, upstream, or a decision",
      unclear: "can't tell",
      yes: "someone could do the task by editing only this file",
    },
    type: {
      defect:
        "Maldonado and Shihab (2015): a part of the code does not have the expected behaviour (a known bug)",
      design:
        "Maldonado and Shihab (2015): a problem with the design of the code: misplaced code, lack of abstraction, long methods, poor implementation, workarounds or a temporary solution",
      documentation:
        "Maldonado and Shihab (2015): there is no proper documentation supporting that part of the program",
      requirement:
        "Maldonado and Shihab (2015): incompleteness of the method, class or program (a feature or case not implemented yet)",
      test: "Maldonado and Shihab (2015): the need for implementation or improvement of the current tests",
    },
    typeRule:
      "One type per comment, the most meaningful one, as Maldonado and Shihab did.",
    valid: {
      no: "at the pinned commit the task is already done, or no longer applies (the code it talks about is gone or changed, the condition it waited for has happened)",
      unclear: "can't tell from the code at the pinned commit",
      yes: "the task still applies at the pinned commit",
    },
  },
  removal: lib.readJson(REMOVALS).codebook,
};

// ── seeded draw ────────────────────────────────────────────────────────
const rng = (seed) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};
const draw = () => {
  const rand = rng(SEED);
  const rows = lib
    .readJson(join(lib.OUT_DIR, "markers.json"))
    .rows.filter(
      (m) =>
        m.kind === "marker" &&
        ["TODO", "FIXME", "XXX", "@todo"].includes(m.term)
    );
  const items = [];
  for (const [repo, n] of Object.entries(ALLOCATION).sort()) {
    const seen = new Set();
    const pool = rows.filter(
      (m) => m.repo === repo && !seen.has(m.commentId) && seen.add(m.commentId)
    );
    const picked = [];
    while (picked.length < n && pool.length > 0) {
      picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    }
    items.push(...picked.sort((a, b) => a.id.localeCompare(b.id)));
  }
  return {
    allocation: ALLOCATION,
    codebook: CODEBOOK.pinned,
    generated: new Date().toISOString().slice(0, 10),
    items: items.map((m, i) => ({
      comment: m.comment.value,
      file: m.file,
      id: `p${String(i + 1).padStart(3, "0")}`,
      line: m.line,
      marker: m.id,
      permalink: m.permalink,
      repo: m.repo,
      set: lib.setOf(m.repo),
      term: m.term,
    })),
    seed: SEED,
  };
};

const context = (item) => {
  const text = readFileSync(
    join(lib.repoMeta(item.repo).root, item.file),
    "utf8"
  ).split("\n");
  const from = Math.max(0, item.line - 13);
  const to = Math.min(text.length, item.line + 12);
  return text
    .slice(from, to)
    .map(
      (l, i) =>
        `${String(from + i + 1).padStart(5)}${from + i + 1 === item.line ? " >" : "  "} ${l}`
    )
    .join("\n");
};

const blindSubset = (items, n, seed) => {
  const rand = rng(seed);
  const pool = [...items];
  const out = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0].id);
  }
  return out.sort();
};

const worksheetPinned = (sample, ids = null) => {
  const out = [
    `# TODOs at the pinned commits (${ids ? ids.length : sample.items.length} items)`,
    "",
    "Label every item with the codebook in results/todo-comments/sample.json `codebook`. The clones under research/corpus/repos/<repo> are at the pinned commits; read other files there as needed, read-only.",
    "",
  ];
  for (const item of sample.items.filter((x) => !ids || ids.includes(x.id))) {
    out.push(
      `## ${item.id} · ${item.repo} · ${item.file}:${item.line}`,
      "",
      item.permalink,
      "",
      "```",
      context(item),
      "```",
      ""
    );
  }
  return out.join("\n");
};

// ── agreement ──────────────────────────────────────────────────────────
const kappa = (pairs) => {
  const n = pairs.length;
  if (n === 0) {
    return null;
  }
  const cats = [...new Set(pairs.flat())];
  const po = pairs.filter(([a, b]) => a === b).length / n;
  let pe = 0;
  for (const c of cats) {
    pe +=
      (pairs.filter(([a]) => a === c).length / n) *
      (pairs.filter(([, b]) => b === c).length / n);
  }
  return pe === 1 ? 1 : Math.round(((po - pe) / (1 - pe)) * 100) / 100;
};
const FIELDS = {
  pinned: [
    "type",
    "onHold",
    "valid",
    "resolvableInFile",
    "changesBehaviour",
    "deleteLosesInfo",
  ],
  removal: ["howRemoved", "mentionedInMessage"],
};
const loadLabels = (rater, kind) => {
  const f = join(lib.OUT_DIR, `labels-${rater}-${kind}.json`);
  if (!existsSync(f)) {
    return null;
  }
  const json = JSON.parse(readFileSync(f, "utf8"));
  return Object.fromEntries((json.items ?? json).map((x) => [x.id, x]));
};
const tally = (xs) =>
  Object.fromEntries(
    Object.entries(
      xs.reduce((a, x) => ({ ...a, [x]: (a[x] ?? 0) + 1 }), {})
    ).sort((a, b) => b[1] - a[1])
  );

// Removals of markers added in the window, by repo and automatic kind (todo-history.cjs).
const removalPopulation = () => {
  const h = lib.readJson(join(lib.RESULTS_DIR, "history.json"));
  const out = {};
  for (const [repo, kinds] of Object.entries(h.removals.perRepo)) {
    for (const [k, n] of Object.entries(kinds)) {
      out[`${repo} · ${k}`] = n;
    }
  }
  return out;
};
// TODO-family comments per repo (one per comment, as drawn), recorded in sample.json.
const pinnedPopulation = () => {
  const rows = lib
    .readJson(join(lib.OUT_DIR, "markers.json"))
    .rows.filter(
      (m) =>
        m.kind === "marker" &&
        ["TODO", "FIXME", "XXX", "@todo"].includes(m.term)
    );
  const out = {};
  for (const repo of Object.keys(ALLOCATION)) {
    out[repo] = new Set(
      rows.filter((m) => m.repo === repo).map((m) => m.commentId)
    ).size;
  }
  return out;
};

const compute = () => {
  const sample = lib.readJson(SAMPLE);
  const removals = lib.readJson(REMOVALS);
  const out = {
    codebook: CODEBOOK,
    generated: new Date().toISOString().slice(0, 10),
    kinds: {},
  };
  for (const [kind, frozen] of [
    ["pinned", sample],
    ["removal", removals],
  ]) {
    const r1 = loadLabels("r1", kind);
    const r2 = loadLabels("r2", kind);
    if (!r1) {
      continue;
    }
    const items = frozen.items.map((x) => ({
      ...x,
      r1: r1[x.id] ?? null,
      r2: r2?.[x.id] ?? null,
    }));
    const missing = items.filter((x) => !x.r1).map((x) => x.id);
    const blind = frozen.blind ?? [];
    const agreement = {};
    for (const field of FIELDS[kind]) {
      const pairs = blind
        .map((id) => items.find((x) => x.id === id))
        .filter((x) => x?.r1 && x?.r2)
        .map((x) => [String(x.r1[field]), String(x.r2[field])]);
      agreement[field] = {
        kappa: kappa(pairs),
        pairs: pairs.length,
        same: pairs.filter(([a, b]) => a === b).length,
      };
    }
    const bySet = (set) =>
      items.filter(
        (x) => x.r1 && (set === "all" || (x.set ?? lib.setOf(x.repo)) === set)
      );
    // Weights: each item stands for its stratum's population (pinned: the repo's TODO-family
    // comments; removals: the repo's removals of that automatic kind) over the items drawn from it.
    const stratum = (x) =>
      kind === "pinned" ? x.repo : `${x.repo} · ${x.autoKind}`;
    const population =
      kind === "pinned" ? frozen.population : removalPopulation();
    const drawn = tally(items.map(stratum));
    const weight = (x) => (population?.[stratum(x)] ?? 0) / drawn[stratum(x)];
    const weighted = (xs, field) => {
      const total = xs.reduce((a, x) => a + weight(x), 0);
      const out = {};
      for (const x of xs) {
        out[String(x.r1[field])] = (out[String(x.r1[field])] ?? 0) + weight(x);
      }
      return Object.fromEntries(
        Object.entries(out)
          .map(([k, v]) => [k, Math.round((v / total) * 1000) / 10])
          .sort((a, b) => b[1] - a[1])
      );
    };
    const shares = {};
    for (const set of kind === "pinned" ? ["core", "react"] : ["all"]) {
      shares[set] = { n: bySet(set).length, weightedPercent: {} };
      for (const field of FIELDS[kind]) {
        shares[set][field] = tally(bySet(set).map((x) => String(x.r1[field])));
        shares[set].weightedPercent[field] = weighted(bySet(set), field);
      }
    }
    const disagreements = blind
      .map((id) => items.find((x) => x.id === id))
      .filter((x) => x?.r1 && x?.r2)
      .flatMap((x) =>
        FIELDS[kind]
          .filter((f) => String(x.r1[f]) !== String(x.r2[f]))
          .map((f) => ({ field: f, id: x.id, r1: x.r1[f], r2: x.r2[f] }))
      );
    out.kinds[kind] = {
      agreement,
      blind,
      disagreements,
      items,
      missing,
      population,
      shares,
    };
  }
  lib.writeJson(join(lib.RESULTS_DIR, "classifications.json"), out);
  for (const [kind, v] of Object.entries(out.kinds)) {
    console.log(kind, JSON.stringify(v.agreement), "missing", v.missing.length);
  }
};

// ── main ───────────────────────────────────────────────────────────────
const main = () => {
  mkdirSync(lib.OUT_DIR, { recursive: true });
  if (lib.flag("worksheet") || lib.flag("print")) {
    let sample =
      existsSync(SAMPLE) && !lib.flag("resample") ? lib.readJson(SAMPLE) : null;
    if (!sample) {
      sample = draw();
    }
    sample.blind ??= blindSubset(sample.items, BLIND.pinned, SEED + 1);
    sample.population ??= pinnedPopulation();
    lib.writeJson(SAMPLE, sample);
    const removals = lib.readJson(REMOVALS);
    removals.blind ??= blindSubset(removals.items, BLIND.removal, SEED + 2);
    lib.writeJson(REMOVALS, removals);
    if (lib.flag("worksheet")) {
      writeFileSync(
        join(lib.OUT_DIR, "worksheet-pinned.md"),
        worksheetPinned(sample)
      );
      console.log(
        `worksheet: ${sample.items.length} pinned items -> out/todo-comments/worksheet-pinned.md`
      );
    }
    if (lib.flag("print")) {
      writeFileSync(
        join(lib.OUT_DIR, "blind-pinned.md"),
        worksheetPinned(sample, sample.blind)
      );
      // The removal worksheet (todo-history.cjs --sample) holds every item; the blind copy keeps
      // the subset's sections only.
      const ws = readFileSync(
        join(lib.OUT_DIR, "removal-worksheet.md"),
        "utf8"
      ).split(/\n(?=## rm\d{3} )/);
      writeFileSync(
        join(lib.OUT_DIR, "blind-removal.md"),
        [
          `# Removal worksheet, blind subset (${removals.blind.length} removals)`,
          ...ws.filter((s) =>
            removals.blind.includes(/^## (rm\d{3})/.exec(s)?.[1])
          ),
        ].join("\n")
      );
      console.log(
        `blind subsets: ${sample.blind.length} pinned, ${removals.blind.length} removals`
      );
    }
  }
  if (lib.flag("compute")) {
    compute();
  }
};

main();
