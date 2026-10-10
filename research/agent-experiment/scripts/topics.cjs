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
//   expectedDiagnostics(subject)    how many diagnostics the pristine subject must produce
//   runFiles(subject)               extra files copied next to the subject into the run dir
//                                   ([{ from, name }], e.g. its tsconfig.json)
//   lockPaths                       extra absolute paths made unreadable while an agent runs, on
//                                   top of this harness's own folders (e.g. corpus notes that
//                                   name the expected fix)
//
// and may export these hooks. When one is absent, the shared script runs its built-in
// cognitive-complexity code, which predates topic modules:
//   prepareSubjects()               builds subjectsDir from the corpus examples
//   measure(runId)                  re-measures one run, writes and returns measure.json
//   summaryLine(measure)            the one-line summary measure.cjs prints
//   aggregate()                     writes results/<topic>/results.json (may return a promise)
//   tables()                        returns the Markdown for results/<topic>/tables.md
//   selfTest()                      self-tests the behavior oracle; returns the number of failures
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
