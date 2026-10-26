// A hand check of the bug-fix heuristic in length-history.cjs: a seeded sample of 60 commits it
// calls fixes and 40 it doesn't (stratified by repo, in proportion to each repo's commits in the
// window, mass commits left out), with each commit's full message and the files it changed in
// scope, for one rater.
//
//   --worksheet  writes results/length-limits/history-check.json (the frozen sample) and
//                out/length-limits/worksheet-commits.md
//   --compute    reads out/length-limits/labels-commits.json and writes precision (of the
//                heuristic's fixes) and the share of real fixes among its non-fixes into
//                history-check.json, weighted to each repo's commits
//
// Only `git show --no-patch` and `git show --name-status` run on the history clones (GIT_NO_LAZY_FETCH=1).
//
// Usage: node research/corpus/scripts/length-history-check.cjs --worksheet | --compute
"use strict";

const { join } = require("node:path");

const lib = require("./length-lib.cjs");

const HIST = join(lib.OUT_DIR, "history");
const FILE = join(lib.RESULTS_DIR, "history-check.json");
const SEED = 20261026;
const N_FIX = 60;
const N_OTHER = 40;
const REPOS = [...lib.CORE];

const git = (name, argv) =>
  lib.spawnSync("git", ["-C", join(lib.HISTORY_DIR, `${name}.git`), ...argv], {
    encoding: "utf8",
    env: { ...process.env, GIT_NO_LAZY_FETCH: "1" },
  }).stdout;

const allocate = (counts, total) => {
  const sum = Object.values(counts).reduce((s, n) => s + n, 0);
  const out = Object.fromEntries(
    Object.entries(counts).map(([k, n]) => [
      k,
      Math.max(1, Math.round((n / sum) * total)),
    ])
  );
  let diff = total - Object.values(out).reduce((s, n) => s + n, 0);
  const keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  for (let i = 0; diff !== 0; i++) {
    const k = keys[i % keys.length];
    out[k] += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
  }
  return out;
};

const worksheet = () => {
  const random = lib.rng(SEED);
  const commits = {};
  for (const name of REPOS) {
    commits[name] = lib
      .readJsonl(join(HIST, `${name}.commits.jsonl`))
      .filter((c) => !c.mass);
  }
  const pick = (fix, total) => {
    const counts = Object.fromEntries(
      REPOS.map((n) => [n, commits[n].filter((c) => c.fix === fix).length])
    );
    const alloc = allocate(counts, total);
    return REPOS.flatMap((n) =>
      lib
        .shuffle(
          commits[n].filter((c) => c.fix === fix),
          random
        )
        .slice(0, alloc[n])
        .map((c) => ({ fix, repo: n, sha: c.sha, subject: c.subject }))
    );
  };
  const items = lib
    .shuffle([...pick(true, N_FIX), ...pick(false, N_OTHER)], lib.rng(SEED + 1))
    .map((c, i) => ({ ...c, id: `C${String(i + 1).padStart(3, "0")}` }));
  const population = Object.fromEntries(
    REPOS.map((n) => [
      n,
      {
        fix: commits[n].filter((c) => c.fix).length,
        other: commits[n].filter((c) => !c.fix).length,
      },
    ])
  );
  lib.writeJson(FILE, {
    generated: new Date().toISOString(),
    items,
    population,
    seed: SEED,
  });
  const blocks = items.map((c) => {
    const msg = git(c.repo, [
      "show",
      "--no-patch",
      "--format=%B",
      c.sha,
    ]).trim();
    const names = git(c.repo, [
      "show",
      "--name-status",
      "--no-renames",
      "--diff-merges=first-parent",
      "--format=",
      c.sha,
    ])
      .trim()
      .split("\n");
    const stat = [
      ...names.slice(0, 12),
      ...(names.length > 12 ? [`… ${names.length - 12} more files`] : []),
    ].join("\n");
    return [
      `### ${c.id} ${c.repo} ${c.sha.slice(0, 10)}`,
      "",
      "```",
      msg.slice(0, 1500),
      "```",
      "",
      "Files changed:",
      "",
      "```",
      stat,
      "```",
      "",
    ].join("\n");
  });
  lib.writeFileSync(
    join(lib.OUT_DIR, "worksheet-commits.md"),
    `# Hand check: is this commit a bug fix?\n\n${items.length} mainline commits from eight repos. For each, decide from its message (and the files it changed) whether it fixes a defect in the code: behaviour that was wrong, a crash, a regression, a wrong type that users hit. Not a bug fix: a feature, a refactor, a dependency or version bump, docs, tests only, CI, formatting, lint, typos. Return a JSON array of \`{ "id": "C001", "bugFix": "yes" | "no" | "unclear", "note": "..." }\`.\n\n${blocks.join("\n")}`
  );
  console.log(`commits worksheet: ${items.length}`);
};

const compute = () => {
  const sample = lib.readJson(FILE);
  if (!lib.existsSync(join(lib.OUT_DIR, "labels-commits.json"))) {
    console.log(
      "no labels in out/length-limits/labels-commits.json: history-check.json is kept as it is"
    );
    return;
  }
  const labels = Object.fromEntries(
    lib
      .readJson(join(lib.OUT_DIR, "labels-commits.json"), [])
      .map((l) => [l.id, l])
  );
  const rate = (fix) => {
    const xs = sample.items.filter((c) => c.fix === fix && labels[c.id]);
    // weight each repo's sample to its share of the population of that class
    let num = 0;
    let den = 0;
    for (const n of REPOS) {
      const ys = xs.filter((c) => c.repo === n);
      if (ys.length === 0) {
        continue;
      }
      const pop = sample.population[n][fix ? "fix" : "other"];
      const yes =
        ys.filter((c) => labels[c.id].bugFix === "yes").length / ys.length;
      num += yes * pop;
      den += pop;
    }
    return {
      labelled: xs.length,
      raw: lib.countBy(xs, (c) => labels[c.id].bugFix),
      weightedYesShare: den ? Math.round((num / den) * 1000) / 10 : null,
    };
  };
  sample.result = {
    heuristicFixes: rate(true),
    heuristicOthers: rate(false),
    note: "heuristicFixes.weightedYesShare is the heuristic's precision; heuristicOthers.weightedYesShare is the share of real fixes it misses among the commits it doesn't call fixes. One rater (a Claude subagent), reading messages and file lists only.",
  };
  sample.labels = sample.items.map((c) => ({
    ...c,
    label: labels[c.id] ?? null,
  }));
  lib.writeJson(FILE, sample);
  console.log(JSON.stringify(sample.result, null, 1));
};

if (lib.flag("worksheet")) {
  worksheet();
}
if (lib.flag("compute")) {
  compute();
}
