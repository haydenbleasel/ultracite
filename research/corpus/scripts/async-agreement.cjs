// Second-rater check for the hand classification of the floating-promise and await-in-loop
// samples (async-sample.cjs).
//
//   --print     pick a seeded subset (--per-kind, default 20) of each kind and print its worksheet
//               blocks WITHOUT the first rater's labels, for blind re-labelling
//   --compute   read results/<topic>/classifications.json (labels + secondRater) and write
//               percent agreement and Cohen's kappa into it as `agreement`
//
// Usage (from the repo root):
//   node research/corpus/scripts/async-agreement.cjs --print [--per-kind 20] [--seed 7]
//   node research/corpus/scripts/async-agreement.cjs --compute
"use strict";

const { readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const HERE = resolve(__dirname, "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const TOPIC = arg("topic", process.env.RESEARCH_TOPIC ?? "floating-promises");
const PER_KIND = Number(arg("per-kind", "20"));
const SEED = Number(arg("seed", "7"));
const DIR = join(HERE, "results", TOPIC);

// The coarse split each kind's write-up relies on.
const COARSE = {
  "await-loop": (c) => {
    if (c.startsWith("sequential-")) {
      return "must stay sequential";
    }
    return c === "parallelizable" ? "parallelizable" : "other";
  },
  floating: (c) => {
    if (c.startsWith("intentional-")) {
      return "intentional";
    }
    return c;
  },
};

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

const subset = () => {
  const { sites, kinds } = JSON.parse(
    readFileSync(join(DIR, "sample.json"), "utf8")
  );
  const random = rng(SEED);
  const picked = {};
  for (const kind of kinds) {
    const ids = sites.filter((s) => s.kind === kind).map((s) => s.id);
    for (let i = 0; i < Math.min(PER_KIND, ids.length); i++) {
      const j = i + Math.floor(random() * (ids.length - i));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    picked[kind] = ids.slice(0, PER_KIND).sort();
  }
  return picked;
};

const print = () => {
  for (const [kind, ids] of Object.entries(subset())) {
    const sheet = readFileSync(
      join(HERE, "out", "floating-promises", `worksheet-${kind}.md`),
      "utf8"
    );
    const blocks = sheet.split(/\n(?=### )/);
    for (const id of ids) {
      process.stdout.write(
        `${blocks.find((b) => b.startsWith(`### ${id} `))}\n`
      );
    }
  }
};

// Cohen's kappa for two raters over the same items.
const kappa = (pairs) => {
  const n = pairs.length;
  const cats = [...new Set(pairs.flat())];
  const observed = pairs.filter(([a, b]) => a === b).length / n;
  const expected = cats.reduce((sum, c) => {
    const pa = pairs.filter(([a]) => a === c).length / n;
    const pb = pairs.filter(([, b]) => b === c).length / n;
    return sum + pa * pb;
  }, 0);
  return expected === 1 ? 1 : (observed - expected) / (1 - expected);
};
const round = (x) => Math.round(x * 100) / 100;

const compute = () => {
  const path = join(DIR, "classifications.json");
  const data = JSON.parse(readFileSync(path, "utf8"));
  const first = new Map(data.labels.map((l) => [l.id, l.category]));
  const agreement = {};
  for (const [kind, ids] of Object.entries(subset())) {
    const rated = ids.filter((id) => data.secondRater[id]);
    const pairs = rated.map((id) => [
      first.get(id),
      data.secondRater[id].category,
    ]);
    const coarsePairs = pairs.map(([a, b]) => [
      COARSE[kind](a),
      COARSE[kind](b),
    ]);
    agreement[kind] = {
      coarse: {
        kappa: round(kappa(coarsePairs)),
        same: coarsePairs.filter(([a, b]) => a === b).length,
      },
      disagreements: rated
        .filter((id) => first.get(id) !== data.secondRater[id].category)
        .map((id) => ({
          first: first.get(id),
          id,
          second: data.secondRater[id].category,
        })),
      ids,
      kappa: round(kappa(pairs)),
      n: pairs.length,
      same: pairs.filter(([a, b]) => a === b).length,
    };
  }
  data.agreement = agreement;
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(JSON.stringify(agreement, null, 2));
};

if (args.includes("--print")) {
  print();
} else if (args.includes("--compute")) {
  compute();
} else {
  console.error("Pass --print or --compute.");
  process.exit(1);
}
