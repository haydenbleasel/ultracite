// The prompt-revision topic (2026-11-11): re-runs subjects of earlier topics with the revised
// agent-fix prompt and loop, to compare with those topics' committed runs.
//
// Each earlier topic it borrows from gets a module next to this file that wraps the original:
// RESEARCH_TOPIC=prompt-revision/<base> runs <base>'s subjects, lint, retry loop, measurement and
// oracle unchanged, and keeps its runs under results/prompt-revision/<base>/runs/. Nothing of the
// base topic is copied. What differs from the base topic's own runs:
//   - run-one.mjs imports buildPrompt and buildRetryPrompt from packages/cli/src/agent-fix/prompt.ts,
//     so the runs get the prompt in the working tree;
//   - the mirror of the rest of agent-fix runs at its "v2" revision (scripts/ultracite-adapters.cjs);
//   - each measured run also gets revision.json (below);
//   - more paths are locked while an agent runs: notes that describe the expected outcomes.
"use strict";

process.env.ULTRACITE_MIRROR = "v2";

const {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");
const lib = require("../../lib.cjs");
const mirror = require("../../ultracite-adapters.cjs");

const LEFT_FOR_REVIEW_RE = /^\W*left for review\W*:(?<numbers>.*)$/imu;

// Written about these subjects' expected outcomes, or about the prompt under test.
const EXTRA_LOCKS = [
  join(lib.REPO_ROOT, "plans"),
  join(lib.REPO_ROOT, ".changeset"),
];

/** The last attempt's stdout: the agent's final message, as run-agent.ts keeps it. */
function finalStdout(runDir) {
  const attempts = existsSync(runDir)
    ? readdirSync(runDir)
        .filter((d) => /^attempt\d+$/.test(d))
        .sort((a, b) => Number(a.slice(7)) - Number(b.slice(7)))
    : [];
  const file = attempts.length
    ? join(runDir, attempts.at(-1), "stdout.txt")
    : join(runDir, "stdout.txt");
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

/**
 * revision.json: what the base topics' measurements don't record, for every run alike. The final
 * message comes from the gitignored stdout; without it (a fresh checkout) the committed file is
 * kept as it is.
 */
function writeRevision(runId, measure) {
  const runDir = join(lib.RUNS_DIR, runId);
  const out = join(runDir, "revision.json");
  const stdout = finalStdout(runDir);
  if (stdout === null) return;
  const { outputCap } = mirror.contract();
  const message = mirror.agentOutput(stdout, outputCap);
  const left = LEFT_FOR_REVIEW_RE.exec(message);
  const label = mirror.AGENT_LABELS[measure.agent];
  const given = measure.handoff?.given ?? measure.diagnosticsGiven ?? [];
  const leftNumbers = left
    ? (left.groups.numbers.match(/\d+/gu) ?? [])
        .map(Number)
        .filter((n) => n >= 1 && n <= given.length)
    : [];
  writeFileSync(
    out,
    `${JSON.stringify(
      lib.redact({
        runId,
        mirrorRevision: mirror.revision(),
        // The whole final message, redacted like every committed artifact.
        finalMessage: message,
        leftForReviewLine: left ? left[0].trim() : null,
        leftForReviewIssues: leftNumbers,
        // The summary line the working tree's index.ts prints. The base topics with the retry
        // loop compute it (ultraciteOutcome, v2 of the mirror); for a single-attempt topic it is
        // derived here from the topic's own "cleared" view of the re-lint.
        ultraciteOutro: measure.ultraciteOutcome?.outro ?? null,
        ultraciteExitCode: measure.ultraciteOutcome?.exitCode ?? null,
        agentLabel: label,
      }),
      null,
      2
    )}\n`
  );
}

function wrap(baseName) {
  const base = require(`../${baseName}.cjs`);
  return {
    ...base,
    lockPaths: [...base.lockPaths, ...EXTRA_LOCKS],
    measure: async (runId) => {
      const measure = await base.measure(runId);
      writeRevision(runId, measure);
      return measure;
    },
  };
}

module.exports = { wrap };
