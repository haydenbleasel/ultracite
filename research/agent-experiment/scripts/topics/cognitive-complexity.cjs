// The first post's topic. Its measurement, aggregation, tables, subject preparation and
// behavior self-test predate topic modules and still live in the shared scripts (measure.cjs,
// aggregate.cjs, report-tables.cjs, prepare-subjects.cjs, test-behavior-harness.cjs and
// behavior.ts), which run them when a topic module doesn't provide those hooks. This module
// only supplies what run-one.mjs needs. See scripts/topics.cjs for the interface.
"use strict";

const { join } = require("node:path");
const lib = require("../lib.cjs");

module.exports = {
  subjectsDir: join(lib.HERE, "subjects"),
  // sonarjs/cognitive-complexity at 15, nothing else.
  lint: lib.lintCognitive,
  expectedDiagnostics: () => 1,
  runFiles: () => [],
  lockPaths: [],
};
