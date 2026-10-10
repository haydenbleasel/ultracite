// Draws a seeded random sample of escape-hatch sites (from escape-hatch-census.cjs) for hand
// classification, and writes a worksheet with each site's code context and a GitHub permalink at
// the pinned SHA.
//
// Equal allocation: up to --per-repo sites of each kind from every external repo, so small repos
// are represented. Pooled shares are then reported both unweighted and weighted by each repo's
// total (see classify-summary.cjs).
//
// Usage (from the repo root):
//   node research/corpus/scripts/sample-escape-hatches.cjs [--kinds any,nonNull] [--per-repo 12]
//     [--seed 20261010] [--topic type-escape-hatches]
// Writes results/<topic>/sample.json (the sampled sites, committed) and
// out/escape-hatches/worksheet-<kind>.md (code context for classifying, gitignored).
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
const TOPIC = arg("topic", process.env.RESEARCH_TOPIC ?? "type-escape-hatches");
const KINDS = arg("kinds", "any,nonNull").split(",");
const PER_REPO = Number(arg("per-repo", "12"));
const SEED = Number(arg("seed", "20261010"));
const BEFORE = 8;
const AFTER = 4;
const DOGFOOD = new Set(["ultracite"]);

// mulberry32: small, seedable, good enough for sampling.
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

// Partial Fisher-Yates: k distinct items, order determined by the seed.
const sample = (items, k, random) => {
  const copy = [...items];
  const n = Math.min(k, copy.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

const main = () => {
  const random = rng(SEED);
  const picked = [];
  const totals = {};
  for (const { name } of config.repos) {
    if (DOGFOOD.has(name)) {
      continue;
    }
    const repo = getRepo(name);
    const sha = execFileSync("git", ["-C", repo.root, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const { sites } = JSON.parse(
      readFileSync(
        join(HERE, "out", "escape-hatches", `${name}.sites.json`),
        "utf8"
      )
    );
    for (const kind of KINDS) {
      const pool = sites.filter((s) => s.kind === kind);
      totals[kind] ??= {};
      totals[kind][name] = pool.length;
      for (const site of sample(pool, PER_REPO, random)) {
        picked.push({
          ...site,
          permalink: `https://github.com/${repo.github}/blob/${sha}/${site.file}#L${site.line}`,
          repo: name,
        });
      }
    }
  }
  picked.forEach((site, i) => {
    site.id = `${site.kind === "any" ? "a" : "n"}${String(i + 1).padStart(3, "0")}`;
  });

  const resultsDir = join(HERE, "results", TOPIC);
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(
    join(resultsDir, "sample.json"),
    `${JSON.stringify({ kinds: KINDS, perRepo: PER_REPO, seed: SEED, sites: picked, totals }, null, 2)}\n`
  );

  const outDir = join(HERE, "out", "escape-hatches");
  for (const kind of KINDS) {
    const blocks = picked
      .filter((s) => s.kind === kind)
      .map((s) => {
        const lines = readFileSync(
          join(getRepo(s.repo).root, s.file),
          "utf8"
        ).split("\n");
        const from = Math.max(1, s.line - BEFORE);
        const to = Math.min(lines.length, s.line + AFTER);
        const body = [];
        for (let n = from; n <= to; n++) {
          body.push(
            `${n === s.line ? ">>" : "  "} ${String(n).padStart(5)} ${lines[n - 1]}`
          );
        }
        return `### ${s.id} ${s.repo} ${s.file}:${s.line}:${s.col} (${s.site ?? s.asserted})\n\n\`\`\`\n${body.join("\n")}\n\`\`\`\n`;
      });
    writeFileSync(join(outDir, `worksheet-${kind}.md`), blocks.join("\n"));
    console.log(
      `${kind}: ${blocks.length} sites -> ${join(outDir, `worksheet-${kind}.md`)}`
    );
  }
};

main();
