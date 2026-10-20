// The hand classification of objects that sort-keys flags.
//
//   --worksheet  draws a seeded sample (frozen in results/sort-keys/sample.json; --resample draws
//                again) of objects ESLint's sort-keys reports, stratified by repo and by where the
//                object goes (order observed, escapes, local), with the order-observed stratum
//                over-sampled, and writes out/sort-keys/worksheet.md: each object with its code,
//                its keys as written and as Oxlint's fix would sort them, what the static analysis
//                saw, its references, and a permalink
//   --print      writes the blind subset for the second rater (out/sort-keys/worksheet-blind.md):
//                the same blocks, a seeded subset, nothing from the first rater
//   --compute    reads out/sort-keys/labels-rater1.json and labels-rater2.json and writes
//                results/sort-keys/classifications.json: both raters' labels, shares weighted to
//                the population by stratum, agreement and Cohen's kappa per field
//
// Usage: node research/corpus/scripts/sort-keys-sample.cjs --worksheet --print | --compute
"use strict";

const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./sort-keys-lib.cjs");

const SEED = 20261019;
const SAMPLE = join(lib.RESULTS_DIR, "sample.json");
const PER_REPO = {
  astro: 12,
  excalidraw: 14,
  hono: 8,
  "next.js": 20,
  trpc: 8,
  vite: 12,
  vscode: 10,
  zod: 10,
  supabase: 6,
};
const BLIND = 36;

const CODEBOOK = {
  behaviour: {
    question:
      "Would sorting the keys (as Oxlint's fix or a person would) change what the program does?",
    values: {
      no: "No use can see the order: lookups, destructuring, a function that reads named options",
      observable:
        "The order is visible but nothing should depend on it: serialised bytes, log output, iteration whose order nobody relies on, a cache key or hash that changes once",
      yes: "Order is semantics: first match wins, a later key overrides an earlier one, evaluation order of values with side effects, TypeScript inference from earlier callbacks, CSS shorthand and longhand, display order, an output format's field order",
      unclear: "Can't tell from the code and its visible uses",
    },
  },
  improvement: {
    question: "Would sorting this object be an improvement for a reader?",
    values: {
      yes: "Sorting makes it easier to scan or diff, and loses nothing",
      neutral: "No real difference",
      no: "Sorting makes it worse: breaks a grouping, an order a reader expects, or behaviour",
      unclear: "Can't tell",
    },
  },
  informationLoss: {
    question:
      "Would sorting lose information a reader uses (a grouping, a sequence, a priority, a correspondence with another structure)?",
    values: { no: "No", unclear: "Can't tell", yes: "Yes" },
  },
  reason: {
    question: "Why are the keys in this order? The most specific that applies.",
    values: {
      arbitrary:
        "No visible reason: the order is how they happened to be typed",
      "data-flow":
        "Data flow or lifecycle: the order things are computed, happen or are used (inputs before outputs, setup before teardown)",
      display:
        "Display order: the order a user sees (menus, columns, form fields, help text)",
      grouping:
        "Semantic grouping: related keys sit together (an identity block, then options, then callbacks)",
      mirrors:
        "Mirrors another structure or a spec: a type, an interface, a protocol message, a file format, another object, a parameter list",
      priority:
        "Priority or first match: the order decides which entry wins or is tried first",
      importance:
        "Importance or convention: the defining key first (type, id, name, kind), then the rest",
      unclear: "Can't tell",
    },
  },
};

const STRATUM = (row) => {
  if (row.flow.some((l) => l.startsWith("order:"))) {
    return "order observed";
  }
  if (row.flow.some((l) => l.startsWith("escape:") || l === "jsx:style")) {
    return "escapes";
  }
  return "local";
};

const loadRows = (name) =>
  lib
    .readJsonl(join(lib.OUT_DIR, "census", `${name}.jsonl`))
    .filter((r) => r.eslintReports > 0);

const draw = () => {
  const random = lib.rng(SEED);
  const items = [];
  const population = {};
  for (const [name, n] of Object.entries(PER_REPO)) {
    const rows = loadRows(name);
    const strata = { escapes: [], local: [], "order observed": [] };
    for (const r of rows) {
      strata[STRATUM(r)].push(r);
    }
    population[name] = Object.fromEntries(
      Object.entries(strata).map(([k, v]) => [k, v.length])
    );
    // A quarter of each repo's draw from the order-observed stratum (all of it if smaller), the
    // rest in proportion to the other two.
    const observed = Math.min(
      strata["order observed"].length,
      Math.round(n / 4)
    );
    const rest = n - observed;
    const others = strata.escapes.length + strata.local.length;
    const local = Math.min(
      strata.local.length,
      Math.max(
        1,
        Math.round((rest * strata.local.length) / Math.max(others, 1))
      )
    );
    const escapes = Math.min(strata.escapes.length, rest - local);
    const plan = { escapes, local, "order observed": observed };
    for (const [stratum, k] of Object.entries(plan)) {
      for (const r of lib.shuffle(strata[stratum], random).slice(0, k)) {
        items.push({
          file: r.file,
          line: r.line,
          repo: name,
          start: r.start,
          stratum,
        });
      }
    }
  }
  items.forEach((it, i) => {
    it.id = `s${String(i + 1).padStart(3, "0")}`;
  });
  return {
    codebook: CODEBOOK,
    generated: new Date().toISOString().slice(0, 10),
    items,
    population,
    seed: SEED,
  };
};

const block = (it, rowsByKey) => {
  const row = rowsByKey.get(`${it.repo}|${it.file}|${it.start}`);
  const root = lib.repoMeta(it.repo).root;
  const lines = readFileSync(join(root, it.file), "utf8").split("\n");
  const from = Math.max(1, row.line - 8);
  const to = Math.min(lines.length, Math.min(row.endLine, row.line + 70) + 4);
  const code = lines
    .slice(from - 1, to)
    .map((l, i) => `${String(from + i).padStart(5)}  ${l}`)
    .join("\n");
  const refs = (row.notes.referenceLines ?? [])
    .filter((l) => l < from || l > to)
    .slice(0, 4)
    .map((l) => {
      const a = Math.max(1, l - 2);
      const b = Math.min(lines.length, l + 2);
      return lines
        .slice(a - 1, b)
        .map((x, i) => `${String(a + i).padStart(5)}  ${x}`)
        .join("\n");
    });
  const keys = row.keys.map((k) =>
    k.t === "spread" ? "..." : (k.e ?? `[${k.t}]`)
  );
  const named = row.keys.filter((k) => k.t !== "spread" && k.o !== null);
  const sorted = [...named]
    .sort((a, b) => lib.oxlintCompare(a.o, b.o))
    .map((k) => k.o);
  return [
    `### ${it.id} ${it.repo} ${it.file}:${row.line}`,
    "",
    `- Permalink: ${lib.permalink(it.repo, it.file, row.line, row.endLine)}`,
    `- Keys as written: ${keys.join(", ")}`,
    `- Keys sorted (Oxlint's order, within spread groups): ${sorted.join(", ")}`,
    `- ESLint reports ${row.eslintReports} pair(s) out of order. Static analysis of where it goes: ${row.flow.join(", ") || "(nothing)"}${row.notes.callees ? `; passed to ${row.notes.callees.join(", ")}` : ""}${row.notes.variable ? `; held in \`${row.notes.variable}\`` : ""}${row.notes.jsonInto ? `; JSON.stringify result goes to ${row.notes.jsonInto.join(", ")}` : ""}`,
    "",
    "```ts",
    code,
    "```",
    ...(refs.length
      ? [
          "",
          "References elsewhere in the file:",
          "",
          "```ts",
          refs.join("\n  ...\n"),
          "```",
        ]
      : []),
    "",
  ].join("\n");
};

const writeWorksheets = (sample) => {
  const rowsByKey = new Map();
  for (const name of Object.keys(PER_REPO)) {
    for (const r of loadRows(name)) {
      rowsByKey.set(`${name}|${r.file}|${r.start}`, r);
    }
  }
  const header = (title, items) =>
    [
      `# ${title}`,
      "",
      `${items.length} object literals that ESLint's sort-keys reports (Ultracite's core preset: ascending, case-sensitive, not natural). Each block shows the object at its pinned commit, its keys as written and as sorting would put them, and what a static analysis saw of where the object goes. The analysis can't see across files or into functions it's passed to. You may open the files in research/corpus/repos/<repo>/ to read more context (read only; don't run anything).`,
      "",
      "## Codebook",
      "",
      ...Object.entries(CODEBOOK).flatMap(([field, c]) => [
        `**${field}**: ${c.question}`,
        "",
        ...Object.entries(c.values).map(([v, d]) => `- \`${v}\`: ${d}`),
        "",
      ]),
      'Label each item as JSON: `{ "id": "s001", "reason": "…", "behaviour": "…", "informationLoss": "…", "improvement": "…", "note": "one sentence on why" }`.',
      "",
      "## Items",
      "",
    ].join("\n");
  writeFileSync(
    join(lib.OUT_DIR, "worksheet.md"),
    header("Sort-keys hand classification", sample.items) +
      sample.items.map((it) => block(it, rowsByKey)).join("\n")
  );
  const blind = lib
    .shuffle(sample.items, lib.rng(SEED + 1))
    .slice(0, BLIND)
    .sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(
    join(lib.OUT_DIR, "worksheet-blind.md"),
    header("Sort-keys hand classification (second rater)", blind) +
      blind.map((it) => block(it, rowsByKey)).join("\n")
  );
  return blind.map((b) => b.id);
};

// ── agreement ──────────────────────────────────────────────────────────
const kappa = (pairs) => {
  const n = pairs.length;
  if (n === 0) {
    return null;
  }
  const cats = [...new Set(pairs.flat())];
  const observed = pairs.filter(([a, b]) => a === b).length / n;
  const expected = cats.reduce(
    (s, c) =>
      s +
      (pairs.filter(([a]) => a === c).length / n) *
        (pairs.filter(([, b]) => b === c).length / n),
    0
  );
  return expected === 1
    ? 1
    : Math.round(((observed - expected) / (1 - expected)) * 100) / 100;
};
const compute = (sample) => {
  const read = (f) => {
    const p = join(lib.OUT_DIR, f);
    if (!existsSync(p)) {
      return null;
    }
    const raw = JSON.parse(readFileSync(p, "utf8"));
    return new Map(
      (Array.isArray(raw) ? raw : raw.labels).map((l) => [l.id, l])
    );
  };
  const r1 = read("labels-rater1.json");
  const r2 = read("labels-rater2.json");
  if (!r1) {
    throw new Error("out/sort-keys/labels-rater1.json is missing");
  }
  const fields = Object.keys(CODEBOOK);
  const items = sample.items.map((it) => ({
    ...it,
    rater1: r1.get(it.id) ?? null,
    rater2: r2?.get(it.id) ?? null,
  }));
  const missing = items.filter((i) => !i.rater1).map((i) => i.id);
  // Shares, unweighted and weighted to the population of flagged objects by repo and stratum.
  const weights = new Map();
  for (const it of items) {
    const k = `${it.repo}|${it.stratum}`;
    const inSample = items.filter((x) => `${x.repo}|${x.stratum}` === k).length;
    weights.set(it.id, sample.population[it.repo][it.stratum] / inSample);
  }
  const shares = {};
  const core = items.filter((i) => i.rater1 && i.repo !== "supabase");
  for (const f of fields) {
    const total = core.reduce((s, i) => s + weights.get(i.id), 0);
    shares[f] = Object.fromEntries(
      Object.keys(CODEBOOK[f].values).map((v) => {
        const hit = core.filter((i) => i.rater1[f] === v);
        return [
          v,
          {
            n: hit.length,
            weightedPct:
              Math.round(
                (hit.reduce((s, i) => s + weights.get(i.id), 0) / total) * 1000
              ) / 10,
          },
        ];
      })
    );
  }
  const byStratum = {};
  for (const s of ["order observed", "escapes", "local"]) {
    const xs = items.filter((i) => i.rater1 && i.stratum === s);
    byStratum[s] = Object.fromEntries(
      fields.map((f) => [
        f,
        xs.reduce(
          (a, i) => ({ ...a, [i.rater1[f]]: (a[i.rater1[f]] ?? 0) + 1 }),
          {}
        ),
      ])
    );
    byStratum[s].n = xs.length;
  }
  const agreement = {};
  if (r2) {
    for (const f of fields) {
      const pairs = items
        .filter((i) => i.rater1 && i.rater2)
        .map((i) => [i.rater1[f], i.rater2[f]]);
      agreement[f] = {
        disagreements: items
          .filter((i) => i.rater1 && i.rater2 && i.rater1[f] !== i.rater2[f])
          .map((i) => ({ first: i.rater1[f], id: i.id, second: i.rater2[f] })),
        kappa: kappa(pairs),
        n: pairs.length,
        same: pairs.filter(([a, b]) => a === b).length,
      };
    }
    // The coarse split the write-up relies on: does sorting change behaviour at all (yes or
    // observable) against no; would it be an improvement (yes) against not.
    const coarse = (f, m) => {
      const pairs = items
        .filter((i) => i.rater1 && i.rater2)
        .map((i) => [m(i.rater1[f]), m(i.rater2[f])]);
      return {
        kappa: kappa(pairs),
        n: pairs.length,
        same: pairs.filter(([a, b]) => a === b).length,
      };
    };
    agreement.coarse = {
      behaviourAny: coarse("behaviour", (v) =>
        v === "no" ? "no" : v === "unclear" ? "unclear" : "some"
      ),
      improvementYes: coarse("improvement", (v) =>
        v === "yes" ? "yes" : "not yes"
      ),
      reasonArbitrary: coarse("reason", (v) =>
        v === "arbitrary" ? "arbitrary" : "a reason"
      ),
    };
  }
  lib.writeJson(join(lib.RESULTS_DIR, "classifications.json"), {
    agreement,
    byStratum,
    codebook: CODEBOOK,
    generated: new Date().toISOString().slice(0, 10),
    items,
    missing,
    note: "Rater 1 labelled every item; rater 2 a blind seeded subset. Weighted shares stand for every object ESLint's sort-keys reports in the eight corpus repos (Supabase's items are listed but not in the shares), weighting each item by its repo and stratum.",
    raters: {
      rater1:
        "A Claude subagent with the worksheet and read-only access to the clones",
      rater2:
        "A separate Claude subagent with the blind subset only, without rater 1's labels",
    },
    shares,
  });
  console.log(
    JSON.stringify(
      {
        agreement: Object.fromEntries(
          Object.entries(agreement).map(([k, v]) => [k, v.kappa ?? v])
        ),
        missing: missing.length,
        shares,
      },
      null,
      1
    )
  );
};

const main = () => {
  let sample =
    existsSync(SAMPLE) && !lib.flag("resample") ? lib.readJson(SAMPLE) : null;
  if (lib.flag("worksheet")) {
    if (!sample) {
      sample = draw();
    }
    const blind = writeWorksheets(sample);
    sample.blind = blind;
    lib.writeJson(SAMPLE, sample);
    console.log(
      `${sample.items.length} items, ${blind.length} in the blind subset; worksheets in out/sort-keys/`
    );
  }
  if (lib.flag("compute")) {
    compute(sample);
  }
};

main();
