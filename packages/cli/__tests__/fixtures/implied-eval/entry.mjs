import core from "../../../config/oxlint/core/index.mjs";

// The root properties `ultracite init` writes. oxlint doesn't carry `env`
// through `extends`, so without `env: core.env` the browser globals are
// unknown and no-implied-eval stays quiet on string timers.
export default {
  env: core.env,
  extends: [core],
  ignorePatterns: core.ignorePatterns,
};
