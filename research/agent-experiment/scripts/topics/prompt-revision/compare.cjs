// The prompt-revision comparison: each subject's runs under the revised agent-fix prompt and loop
// beside the same subject's committed runs from its own topic (results/<base>/runs/), which used
// the prompt of their day. There are two rounds of revised runs, each with its own prompt text:
// round one in results/prompt-revision/<base>/runs/ (five subjects), and round two, after three
// lines of the prompt were reworded, in results/prompt-revision/round-2/<base>/runs/ (three of
// the five), and round three (2026-11-18), after the evasion line was reworded and a line about
// lazy loads added, in results/prompt-revision/round-3/<base>/runs/ (b-ox again, and one subject
// each from the nested-ternaries and type-imports topics, which rounds one and two didn't run).
// A run's meta.json records the hash of the prompt.ts it used.
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

const SIDES = ["old", "new", "round2", "round3"];

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
  // Round three only.
  {
    base: "nested-ternaries",
    subject: "c",
    title:
      "c, a nested ternary with a counter in one branch (Astro's `getConfigAlias`)",
    linter: "Oxlint core + react, `no-nested-ternary`",
    retryLoop: true,
    question:
      "Is the ternary still rewritten, with behaviour kept and nothing left for review?",
    outcome: (m) => m.final?.response ?? "no verdict",
    detail: (m) => m.final?.outcome ?? "",
    detailLabel: "Edit",
    cleared: (m) => m.ultraciteOutcome?.remaining === 0,
    good: (m) =>
      /behaviour kept/.test(m.final?.response ?? "") &&
      m.final?.leftForReview === "none" &&
      m.ultraciteOutcome?.remaining === 0,
  },
  {
    base: "type-imports",
    subject: "c",
    title:
      "c, a `require` inside a build-flag branch (Next.js's client `normalizeLocalePath`)",
    linter:
      "Oxlint core, `node/global-require` and `unicorn/prefer-module` (and, before 6c351c5a, `consistent-type-imports`)",
    retryLoop: true,
    question:
      "Does the i18n module still load only when the flag is set (the topic's oracle, in its three modes)?",
    outcome: (m) => m.final?.response ?? "no verdict",
    detail: (m) => m.final?.outcome ?? "",
    detailLabel: "Edit",
    cleared: (m) => m.ultraciteOutcome?.remaining === 0,
    // The oracle's verdict on the final file, as the base topic words it: a static import is
    // "behaviour changed in repo, kept, elided (wrong)".
    good: (m) => !/behaviour changed|\(wrong\)/.test(m.final?.response ?? ""),
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
    // Added with round three, for every run that records them.
    issuesHandedOver: given,
    leftForReviewRules:
      m.final?.leftForReviewRules ??
      (m.attempts ?? []).at(-1)?.leftForReviewRules ??
      null,
    leftForReviewLine: revision?.leftForReviewLine ?? null,
    mirrorRevision: meta.ultracite?.mirrorRevision ?? null,
    // Tool calls named Bash in a Claude run's session logs (null where the measure has no list).
    bashCalls:
      m.agent === "claude" &&
      (m.attempts ?? []).every((a) => Array.isArray(a.session?.toolCalls))
        ? (m.attempts ?? []).reduce(
            (n, a) =>
              n + a.session.toolCalls.filter((t) => t === "Bash").length,
            0
          )
        : null,
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
  round3Date: "2026-11-18",
  subjects: SUBJECTS.map((spec) => {
    const oldDir = join(RESULTS, spec.base, "runs");
    const newDir = join(OUT, spec.base, "runs");
    const round2Dir = join(OUT, "round-2", spec.base, "runs");
    const round3Dir = join(OUT, "round-3", spec.base, "runs");
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
      round3: runIds(round3Dir, spec.subject).map((id) =>
        row(round3Dir, id, spec, "round3")
      ),
    };
    const byAgent = {};
    for (const agent of AGENTS) {
      byAgent[agent] = {};
      for (const side of SIDES) {
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
          bashCalls: rows.some((r) => r.bashCalls !== null)
            ? rows.reduce((n, r) => n + (r.bashCalls ?? 0), 0)
            : null,
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
        new:
          sides.new.length > 0
            ? "round one: the prompt reworded on 2026-11-11"
            : "not run",
        round2:
          sides.round2.length > 0
            ? "round two: three lines of that prompt reworded again, 2026-11-12"
            : "not run",
        round3:
          sides.round3.length > 0
            ? "round three: the prompt at 6a8d57fa (the evasion line reworded, a lazy-load line added), 2026-11-18"
            : "not run",
      },
      promptTsSha256: {
        new: [...new Set(sides.new.map((r) => r.promptTsSha256))],
        round2: [...new Set(sides.round2.map((r) => r.promptTsSha256))],
        round3: [...new Set(sides.round3.map((r) => r.promptTsSha256))],
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
  'Generated by `scripts/topics/prompt-revision/compare.cjs` from `results.json`. See REPORT.md for method and caveats. "Before" is the subject\'s committed runs in its own topic, "round one" is this topic\'s first runs, and "round two" is the runs after three prompt lines were reworded again (three subjects only). "Round three" is the runs of 2026-11-18, with the prompt at 6a8d57fa (three subjects, two of them not run in rounds one and two). Four runs per cell.',
  "",
  "## Runs with the right result",
  "",
  "| Subject | Agent | Before | Round one | Round two | Round three |",
  "| --- | --- | --- | --- | --- | --- |",
];
const of = (side, key) =>
  side.runs > 0 ? `${side[key]} of ${side.runs}` : "not run";
for (const s of results.subjects) {
  for (const agent of AGENTS) {
    const { old, new: now, round2, round3 } = s.byAgent[agent];
    lines.push(
      `| ${cell(s.title)} | ${LABELS[agent]} | ${of(old, "good")} | ${of(now, "good")} | ${of(round2, "good")} | ${of(round3, "good")} |`
    );
  }
}
lines.push(
  "",
  "## Left for review, re-lint clear, retries",
  "",
  '| Subject | Agent | Round | Left for review | Re-lint clear | Retried | Ends "Left for review:" with nothing left | Bash calls (Claude) |',
  "| --- | --- | --- | --- | --- | --- | --- | --- |"
);
const ROUND_NAMES = {
  old: "before",
  new: "round one",
  round2: "round two",
  round3: "round three",
};
for (const s of results.subjects) {
  for (const agent of AGENTS) {
    for (const side of SIDES) {
      const c = s.byAgent[agent][side];
      if (c.runs === 0) continue;
      lines.push(
        `| ${s.base} ${s.subject} | ${LABELS[agent]} | ${ROUND_NAMES[side]} | ${of(c, "leftForReview")} | ${of(c, "relintClear")} | ${c.retried} | ${side === "old" ? "not read" : of(c, "saidLeftForReviewNone")} | ${agent === "claude" ? (c.bashCalls ?? "not recorded") : "–"} |`
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
    "| Run | Issues handed over | Outcome | Edit or silencing | Left for review | Attempts | Seconds | Ultracite's summary |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  );
  for (const side of SIDES) {
    for (const r of s.runs[side]) {
      lines.push(
        `| ${ROUND_NAMES[side]} ${r.runId} | ${r.issuesHandedOver} | ${cell(r.outcome)} | ${cell(r.detail)} | ${r.leftForReview}${r.leftForReviewRules?.length ? ` (${cell(r.leftForReviewRules.join(", "))})` : ""} | ${r.attempts}${r.timedOut ? " (timed out)" : ""} | ${r.wallSeconds} | ${cell(r.ultraciteOutro)} |`
      );
    }
  }
}
writeFileSync(join(OUT, "tables.md"), `${lines.join("\n")}\n`);
console.log(
  results.subjects
    .map(
      (s) =>
        `${s.base} ${s.subject}: ${AGENTS.map((a) => `${a} ${s.byAgent[a].old.good}/${s.byAgent[a].old.runs} -> ${s.byAgent[a].new.good}/${s.byAgent[a].new.runs} -> ${s.byAgent[a].round2.good}/${s.byAgent[a].round2.runs} -> ${s.byAgent[a].round3.good}/${s.byAgent[a].round3.runs}`).join(", ")}`
    )
    .join("\n")
);
