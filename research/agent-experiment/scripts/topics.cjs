// Loads the module for one post's topic (RESEARCH_TOPIC, default cognitive-complexity) from
// scripts/topics/<topic>.cjs. A topic module is how a new post plugs into the shared harness
// (run-one.mjs, run-batch.mjs, measure.cjs, aggregate.cjs, report-tables.cjs,
// prepare-subjects.cjs, test-behavior-harness.cjs) without changing it.
//
// Every topic module exports:
//   subjectsDir                     where subjects.json and <id>/<basename> live
//   lint(file, { honorInlineConfig })
//                                   the ESLint run whose messages become the agent's diagnostics
//                                   (an ESLint result, round-tripped through JSON as `eslint -f
//                                   json` prints it). honorInlineConfig false is the "genuinely
//                                   cleared" view.
//   expectedDiagnostics(subject)    how many diagnostics the pristine subject must produce; for a
//                                   multi-file subject (below), the array of { file, count } its
//                                   handoff must produce, in order
//   runFiles(subject)               extra files copied next to the subject into the run dir
//                                   ([{ from, name }], e.g. its tsconfig.json)
//   lockPaths                       extra absolute paths made unreadable while an agent runs, on
//                                   top of this harness's own folders (e.g. corpus notes that
//                                   name the expected fix). Paths outside the repo that only
//                                   exist on one machine go in AGENT_EXPERIMENT_EXTRA_LOCKS
//                                   (colon-separated), which run-one.mjs adds for every topic.
//
// and may export these hooks. When one is absent, the shared script runs its built-in
// cognitive-complexity code, which predates topic modules:
//   toDiagnostics(lintResult)       turns `lint`'s result into Ultracite's diagnostics, for a
//                                   topic whose lint isn't ESLint (dead-code's Oxlint subject);
//                                   default: the ESLint adapter's shape (lib.toUltraciteDiagnostics)
//   prepareSubjects()               builds subjectsDir from the corpus examples
//   measure(runId)                  re-measures one run, writes and returns measure.json
//   summaryLine(measure)            the one-line summary measure.cjs prints
//   aggregate()                     writes results/<topic>/results.json (may return a promise)
//   tables()                        returns the Markdown for results/<topic>/tables.md
//   selfTest()                      self-tests the behavior oracle; returns the number of failures
//
// Multi-file subjects (added with the import-cycles topic). A subject whose subjects.json entry
// has `files` (paths relative to its `dir`, under this folder) is copied whole into the run dir.
// Its topic module must then export
//   handoff(subject, runDir, { runId })
//                                   lints the run dir as `ultracite fix` would and returns
//                                   { groups: [{ file, issues }], info }: the files Ultracite
//                                   hands over, in its order, each with its diagnostics (Ultracite's
//                                   Diagnostic shape), and facts about the handoff for meta.json.
//                                   run-one.mjs gives each group its own agent run, one after
//                                   another in the same run dir, and records every file's changes
//                                   per step (see runMultiFile there). `lint` and `toDiagnostics`
//                                   aren't used for these subjects.
"use strict";

const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { TOPIC } = require("./lib.cjs");

function loadTopic(topic = TOPIC) {
  const file = join(__dirname, "topics", `${topic}.cjs`);
  if (!existsSync(file)) {
    throw new Error(
      `no topic module for "${topic}": add scripts/topics/${topic}.cjs (see scripts/topics.cjs)`
    );
  }
  return require(file);
}

module.exports = { loadTopic };
