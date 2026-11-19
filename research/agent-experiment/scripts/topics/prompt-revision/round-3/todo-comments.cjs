// Round three of the prompt-revision topic (2026-11-18): the same wrapper, with its runs kept under
// results/prompt-revision/round-3/todo-comments/runs/, on the mirror's v5 revision (the agent-fix
// code at 10153e7d).
"use strict";

module.exports = require("../wrap.cjs").wrap("todo-comments", {
  adapter:
    "linters.ts runOxlintPass: oxlint --fix . (run a second time when the first exits non-zero), oxfmt --write ., oxlint -f json .",
  mirror: "v5",
});
