// Round three of the prompt-revision topic (2026-11-18): the same wrapper, with its runs kept under
// results/prompt-revision/round-3/type-imports/runs/, on the mirror's v5 revision (the agent-fix
// code at 10153e7d). Subject C's handoff is now two issues, not the base topic's three (below).
"use strict";

module.exports = require("../wrap.cjs").wrap("type-imports", {
  adapter:
    "linters.ts runOxlintPass: oxlint --fix . (run a second time when the first exits non-zero), oxfmt --write ., oxlint -f json .",
  // 6c351c5a set `disallowTypeAnnotations: false`, so Oxlint no longer reports C's `import()` type
  // annotation: the handoff is the two require rules.
  expected: { c: ["node/global-require", "unicorn/prefer-module"] },
  mirror: "v5",
});
