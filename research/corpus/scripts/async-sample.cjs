// Draws a seeded sample of floating-promise sites and `await`-in-loop sites for hand
// classification, and writes worksheets with each site's code context and a GitHub permalink at
// the pinned SHA.
//
//   floating      the union, per repo, of typescript-eslint's no-floating-promises and
//                 no-misused-promises hits (async-typed-census.cjs) and the syntactic detector's
//                 floating sites the typed rules missed (async-census.cjs), deduplicated by line
//   await-loop    Oxlint's raw no-await-in-loop hits (rule-census.cjs), joined to the detector's
//                 sites for the loop's start line
//
// Equal allocation: up to --per-repo sites of each kind from every external repo, so small repos
// are represented. Pooled shares are reported unweighted and weighted by each repo's total.
//
// Usage (from the repo root):
//   node research/corpus/scripts/async-sample.cjs [--per-repo 12] [--seed 20261010]
//     [--topic floating-promises]
// Writes results/<topic>/sample.json (committed) and out/floating-promises/worksheet-<kind>.md.
"use strict";

const { execFileSync } = require("node:child_process");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const { getRepo } = require("./collect-files.cjs");
const config = require("./repos.json");

const HERE = resolve(__dirname, "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const TOPIC = arg("topic", process.env.RESEARCH_TOPIC ?? "floating-promises");
const PER_REPO = Number(arg("per-repo", "12"));
const SEED = Number(arg("seed", "20261010"));
const OUT_DIR = join(HERE, "out", "floating-promises");
const DOGFOOD = new Set(["ultracite"]);

// mulberry32, as in sample-escape-hatches.cjs.
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d_2b_79_f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};
const sample = (items, k, random) => {
  const copy = [...items];
  const n = Math.min(k, copy.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};
const byPosition = (a, b) =>
  a.file.localeCompare(b.file) ||
  a.line - b.line ||
  (a.column ?? 0) - (b.column ?? 0);

const floatingPool = (name) => {
  const typed = JSON.parse(
    readFileSync(join(OUT_DIR, "typed", `${name}.json`), "utf8")
  ).eslint;
  const { sites } = JSON.parse(
    readFileSync(join(OUT_DIR, `${name}.sites.json`), "utf8")
  );
  const pool = new Map();
  for (const h of typed) {
    if (h.rule !== "no-floating-promises" && h.rule !== "no-misused-promises") {
      continue;
    }
    const k = `${h.file}:${h.line}`;
    const entry = pool.get(k) ?? {
      column: h.column,
      file: h.file,
      line: h.line,
      sources: [],
    };
    entry.sources.push(`${h.rule}:${h.messageId}`);
    pool.set(k, entry);
  }
  for (const s of sites) {
    const floating =
      s.kind === "floating-call" ||
      s.kind === "floating-chain" ||
      (s.kind === "map-async" && s.fate === "bare statement");
    const k = `${s.file}:${s.line}`;
    if (floating && !pool.has(k)) {
      pool.set(k, {
        column: s.col,
        file: s.file,
        line: s.line,
        sources: [`detector:${s.kind}`],
      });
    }
  }
  return [...pool.values()].sort(byPosition);
};

const awaitLoopPool = (name) => {
  const { hits } = JSON.parse(
    readFileSync(
      join(HERE, "out", "rule-census", TOPIC, `${name}.raw.json`),
      "utf8"
    )
  );
  const { sites } = JSON.parse(
    readFileSync(join(OUT_DIR, `${name}.sites.json`), "utf8")
  );
  const loops = new Map(
    sites
      .filter((s) => s.kind === "await-in-loop")
      .map((s) => [`${s.file}:${s.line}:${s.col}`, s])
  );
  return hits
    .filter((h) => h.rule === "no-await-in-loop")
    .map((h) => {
      const s = loops.get(`${h.file}:${h.line}:${h.column}`);
      return {
        column: h.column,
        file: h.file,
        line: h.line,
        loop: s?.loop ?? null,
        loopLine: s?.loopLine ?? null,
      };
    })
    .sort(byPosition);
};

const context = (repoName, site, kind) => {
  const lines = readFileSync(
    join(getRepo(repoName).root, site.file),
    "utf8"
  ).split("\n");
  // For a loop, start at the loop header (at most 30 lines up); otherwise 10 lines of lead-in.
  const from =
    kind === "await-loop" && site.loopLine
      ? Math.max(1, Math.max(site.loopLine - 3, site.line - 30))
      : Math.max(1, site.line - 10);
  const to = Math.min(lines.length, site.line + 8);
  const body = [];
  for (let n = from; n <= to; n++) {
    body.push(
      `${n === site.line ? ">>" : "  "} ${String(n).padStart(5)} ${lines[n - 1]}`
    );
  }
  return body.join("\n");
};

const main = () => {
  const random = rng(SEED);
  const picked = [];
  const totals = { "await-loop": {}, floating: {} };
  for (const { name } of config.repos) {
    if (DOGFOOD.has(name)) {
      continue;
    }
    const repo = getRepo(name);
    const sha = execFileSync("git", ["-C", repo.root, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    for (const [kind, pool] of [
      ["floating", floatingPool(name)],
      ["await-loop", awaitLoopPool(name)],
    ]) {
      totals[kind][name] = pool.length;
      for (const site of sample(pool, PER_REPO, random).sort(byPosition)) {
        picked.push({
          ...site,
          kind,
          permalink: `https://github.com/${repo.github}/blob/${sha}/${site.file}#L${site.line}`,
          repo: name,
        });
      }
    }
  }
  let f = 0;
  let w = 0;
  for (const site of picked) {
    site.id =
      site.kind === "floating"
        ? `f${String(++f).padStart(3, "0")}`
        : `w${String(++w).padStart(3, "0")}`;
  }
  const resultsDir = join(HERE, "results", TOPIC);
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(
    join(resultsDir, "sample.json"),
    `${JSON.stringify({ kinds: ["floating", "await-loop"], perRepo: PER_REPO, seed: SEED, sites: picked, totals }, null, 2)}\n`
  );
  mkdirSync(OUT_DIR, { recursive: true });
  for (const kind of ["floating", "await-loop"]) {
    const blocks = picked
      .filter((s) => s.kind === kind)
      .map(
        (s) =>
          `### ${s.id} ${s.repo} ${s.file}:${s.line}${s.sources ? ` (${s.sources.join(", ")})` : ` (${s.loop ?? "loop"} at line ${s.loopLine ?? "?"})`}\n\n${s.permalink}\n\n\`\`\`\n${context(s.repo, s, kind)}\n\`\`\`\n`
      );
    writeFileSync(join(OUT_DIR, `worksheet-${kind}.md`), blocks.join("\n"));
    console.log(
      `${kind}: ${blocks.length} sites from ${JSON.stringify(totals[kind])} -> ${join(OUT_DIR, `worksheet-${kind}.md`)}`
    );
  }
};

main();
