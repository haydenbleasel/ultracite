// The prompt-revision comparison: each subject's runs under the revised agent-fix prompt and loop
// beside the same subject's committed runs from its own topic (results/<base>/runs/), which used
// the prompt of their day. There are two rounds of revised runs, each with its own prompt text:
// round one in results/prompt-revision/<base>/runs/ (five subjects), and round two, after three
// lines of the prompt were reworded, in results/prompt-revision/round-2/<base>/runs/ (three of
// the five). A run's meta.json records the hash of the prompt.ts it used.
//
// Usage: node scripts/topics/prompt-revision/compare.cjs
//   -> results/prompt-revision/results.json and tables.md
//
// Both sides are read from the runs' measure.json, written by the base topic's own measurement
// and oracle, so a row means the same thing on both sides. Nothing is re-measured here, and no
// agent runs.
"use strict";

const {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} = require("node:fs");
const { join, resolve } = require("node:path");

const HERE = resolve(__dirname, "../../..");
const RESULTS = join(HERE, "results");
const OUT = join(RESULTS, "prompt-revision");
const AGENTS = ["claude", "codex"];
const LABELS = { claude: "Claude Code", codex: "Codex" };

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

// What the question is for each subject, and how a run's measure.json answers it. `outcome` is the
// base topic's own verdict; `good` says whether that verdict is the result the base topic's
// subjects.json calls right.
const SUBJECTS = [
  {
    base: "floating-promises",
    subject: "fp1",
    title: "fp1, a lost rejection (Hono's `createPool`)",
    linter: "ESLint, typescript-eslint with types, `no-misused-promises`",
    retryLoop: false,
    question:
      "Does the caller see a failure in a queued call? Before, it hung forever.",
    outcome: (m) => m.behavior?.errorPath?.verdict ?? "no verdict",
    detail: (m) => (m.silencingSignals ?? []).join("; ") || "none",
    detailLabel: "Silencing",
    cleared: (m) => m.lint?.asUltraciteSees?.cleared === true,
    good: (m) =>
      !/original behavior/.test(m.behavior?.errorPath?.verdict ?? "") &&
      m.behavior?.happyPath?.ok === true,
  },
  {
    base: "todo-comments",
    subject: "b-ox",
    title: "b-ox, a TODO recording a live bug (Vite's HMR prune)",
    linter: "Oxlint core + react, `no-warning-comments`",
    retryLoop: true,
    question: "Is the record of the bug still there?",
    outcome: (m) => m.final?.response ?? "no verdict",
    detail: (m) => m.final?.outcome ?? "",
    detailLabel: "Edit",
    cleared: (m) => m.ultraciteOutcome?.remaining === 0,
    good: (m) => /\(right\)/.test(m.final?.response ?? ""),
  },
  {
    base: "length-limits",
    subject: "a",
    title: "a, a long function that reads top to bottom (Vite's client config)",
    linter: "Oxlint core with `max-lines-per-function` on",
    retryLoop: true,
    question: "Was the function left as it is, or split?",
    outcome: (m) => m.final?.response ?? "no verdict",
    detail: (m) => m.final?.outcome ?? "",
    detailLabel: "Edit",
    cleared: (m) => m.ultraciteOutcome?.remaining === 0,
    good: (m) => m.final?.leftForReview !== "none",
  },
  {
    base: "react-effects",
    subject: "a",
    title:
      "a, a missing dependency that is a real bug (Hono's `useSyncExternalStore`)",
    linter: "Oxlint react, `exhaustive-deps` and the compiler's effect rule",
    retryLoop: true,
    question:
      "Is the bug fixed without resubscribing on every render, or left with the change named?",
    outcome: (m) => m.final?.response ?? "no verdict",
    detail: (m) => m.final?.outcome ?? "",
    detailLabel: "Edit",
    cleared: (m) => m.ultraciteOutcome?.remaining === 0,
    good: (m) =>
      /^fixed/.test(m.final?.response ?? "") ||
      m.final?.leftForReview !== "none",
  },
  {
    base: "dead-code",
    subject: "dc2",
    title: "dc2, the control: a leftover variable (Vite's static middleware)",
    linter: "ESLint core, `no-useless-assignment` and `sonarjs/no-dead-store`",
    retryLoop: false,
    question: "Is the leftover still deleted, with nothing left for review?",
    outcome: (m) => `${m.autoApproach}; behavior ${m.behavior?.verdict}`,
    detail: () => "",
    detailLabel: "",
    cleared: (m) => m.lint?.asUltraciteSees?.cleared === true,
    good: (m) =>
      m.autoApproach === "deleted the dead code" &&
      m.behavior?.verdict === "identical",
  },
];

function runIds(dir, subject) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((id) =>
      AGENTS.some((agent) => new RegExp(`^${subject}-${agent}-\\d+$`).test(id))
    )
    .filter((id) => existsSync(join(dir, id, "measure.json")))
    .sort();
}

function row(dir, id, spec, side) {
  const m = readJson(join(dir, id, "measure.json"));
  const meta = readJson(join(dir, id, "meta.json"));
  const revisionFile = join(dir, id, "revision.json");
  const revision = existsSync(revisionFile) ? readJson(revisionFile) : null;
  // The base topics with the retry loop record what the agent left (final.leftForReview: "none",
  // "some" or "all"). For the others, and for every old run, the final message is read here.
  const leftIssues = revision?.leftForReviewIssues ?? [];
  const left =
    m.final?.leftForReview ?? (leftIssues.length > 0 ? "all" : "none");
  const cleared = spec.cleared(m);
  const given = (m.handoff?.given ?? m.diagnosticsGiven ?? []).length;
  // The summary line: the base topic's (v1 or v2 of the mirror) where it has the retry loop;
  // otherwise what index.ts prints for one file whose re-lint is clean or not.
  const derivedOutro = () => {
    const fixed = cleared ? given : 0;
    const leftNote =
      side !== "old" && !cleared && leftIssues.length > 0
        ? ` ${leftIssues.length} left for you to decide.`
        : "";
    return `Fixed ${fixed} of ${given} issue${given === 1 ? "" : "s"} with ${LABELS[m.agent]}.${leftNote}`;
  };
  return {
    runId: id,
    agent: m.agent,
    cliVersion: m.cliVersion,
    models: m.agentStats?.models ?? m.cost?.models ?? null,
    outcome: spec.outcome(m),
    detail: spec.detail(m),
    leftForReview: left,
    good: spec.good(m),
    relintClear: cleared,
    attempts: m.attemptCount ?? 1,
    timedOut: m.timedOut === true || (m.attempts ?? []).some((a) => a.timedOut),
    wallSeconds: m.wallSeconds,
    ultraciteOutro: m.ultraciteOutcome?.outro ?? `${derivedOutro()} (derived)`,
    promptTsSha256: meta.ultracite?.promptTsSha256 ?? null,
    // The agent ended its message with a "Left for review:" line that lists no issue.
    leftForReviewNoneLine:
      revision !== null &&
      revision.leftForReviewLine !== null &&
      leftIssues.length === 0 &&
      left === "none",
  };
}

const tally = (rows, key) => {
  const counts = {};
  for (const r of rows) counts[r[key]] = (counts[r[key]] ?? 0) + 1;
  return counts;
};

const results = {
  generatedBy: "scripts/topics/prompt-revision/compare.cjs",
  date: "2026-11-11",
  subjects: SUBJECTS.map((spec) => {
    const oldDir = join(RESULTS, spec.base, "runs");
    const newDir = join(OUT, spec.base, "runs");
    const round2Dir = join(OUT, "round-2", spec.base, "runs");
    const sides = {
      old: runIds(oldDir, spec.subject).map((id) =>
        row(oldDir, id, spec, "old")
      ),
      new: runIds(newDir, spec.subject).map((id) =>
        row(newDir, id, spec, "new")
      ),
      round2: runIds(round2Dir, spec.subject).map((id) =>
        row(round2Dir, id, spec, "round2")
      ),
    };
    const byAgent = {};
    for (const agent of AGENTS) {
      byAgent[agent] = {};
      for (const side of ["old", "new", "round2"]) {
        const rows = sides[side].filter((r) => r.agent === agent);
        byAgent[agent][side] = {
          runs: rows.length,
          saidLeftForReviewNone: rows.filter((r) => r.leftForReviewNoneLine)
            .length,
          good: rows.filter((r) => r.good).length,
          leftForReview: rows.filter((r) => r.leftForReview !== "none").length,
          relintClear: rows.filter((r) => r.relintClear).length,
          retried: rows.filter((r) => r.attempts > 1).length,
          timedOut: rows.filter((r) => r.timedOut).length,
          outcomes: tally(rows, "outcome"),
        };
      }
    }
    return {
      base: spec.base,
      subject: spec.subject,
      title: spec.title,
      linter: spec.linter,
      retryLoop: spec.retryLoop,
      question: spec.question,
      rounds: {
        old: "the subject's own topic, with the prompt of its day",
        new: "round one: the prompt reworded on 2026-11-11",
        round2:
          sides.round2.length > 0
            ? "round two: three lines of that prompt reworded again, 2026-11-12"
            : "not run",
      },
      promptTsSha256: {
        new: [...new Set(sides.new.map((r) => r.promptTsSha256))],
        round2: [...new Set(sides.round2.map((r) => r.promptTsSha256))],
      },
      byAgent,
      runs: sides,
    };
  }),
};

writeFileSync(
  join(OUT, "results.json"),
  `${JSON.stringify(results, null, 2)}\n`
);

// ---------------------------------------------------------------- tables.md

const cell = (text) =>
  String(text).replaceAll("|", "\\|").replaceAll("\n", " ");
const lines = [
  "# Prompt revision: tables",
  "",
  'Generated by `scripts/topics/prompt-revision/compare.cjs` from `results.json`. See REPORT.md for method and caveats. "Before" is the subject\'s committed runs in its own topic, "round one" is this topic\'s first runs, and "round two" is the runs after three prompt lines were reworded again (three subjects only). Four runs per cell.',
  "",
  "## Runs with the right result",
  "",
  "| Subject | Agent | Before | Round one | Round two |",
  "| --- | --- | --- | --- | --- |",
];
const of = (side, key) =>
  side.runs > 0 ? `${side[key]} of ${side.runs}` : "not run";
for (const s of results.subjects) {
  for (const agent of AGENTS) {
    const { old, new: now, round2 } = s.byAgent[agent];
    lines.push(
      `| ${cell(s.title)} | ${LABELS[agent]} | ${of(old, "good")} | ${of(now, "good")} | ${of(round2, "good")} |`
    );
  }
}
lines.push(
  "",
  "## Left for review, re-lint clear, retries",
  "",
  '| Subject | Agent | Round | Left for review | Re-lint clear | Retried | Ends "Left for review:" with nothing left |',
  "| --- | --- | --- | --- | --- | --- | --- |"
);
const ROUND_NAMES = { old: "before", new: "round one", round2: "round two" };
for (const s of results.subjects) {
  for (const agent of AGENTS) {
    for (const side of ["old", "new", "round2"]) {
      const c = s.byAgent[agent][side];
      if (c.runs === 0) continue;
      lines.push(
        `| ${s.base} ${s.subject} | ${LABELS[agent]} | ${ROUND_NAMES[side]} | ${of(c, "leftForReview")} | ${of(c, "relintClear")} | ${c.retried} | ${side === "old" ? "not read" : of(c, "saidLeftForReviewNone")} |`
      );
    }
  }
}
for (const s of results.subjects) {
  lines.push(
    "",
    `## ${s.base} ${s.subject}`,
    "",
    `${s.title}. ${s.linter}. ${s.question}`,
    "",
    "| Run | Outcome | Edit or silencing | Left for review | Attempts | Seconds | Ultracite's summary |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  );
  for (const side of ["old", "new", "round2"]) {
    for (const r of s.runs[side]) {
      lines.push(
        `| ${ROUND_NAMES[side]} ${r.runId} | ${cell(r.outcome)} | ${cell(r.detail)} | ${r.leftForReview} | ${r.attempts}${r.timedOut ? " (timed out)" : ""} | ${r.wallSeconds} | ${cell(r.ultraciteOutro)} |`
      );
    }
  }
}
writeFileSync(join(OUT, "tables.md"), `${lines.join("\n")}\n`);
console.log(
  results.subjects
    .map(
      (s) =>
        `${s.base} ${s.subject}: ${AGENTS.map((a) => `${a} ${s.byAgent[a].old.good}/${s.byAgent[a].old.runs} -> ${s.byAgent[a].new.good}/${s.byAgent[a].new.runs} -> ${s.byAgent[a].round2.good}/${s.byAgent[a].round2.runs}`).join(", ")}`
    )
    .join("\n")
);
