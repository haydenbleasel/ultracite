import { createRequire } from "node:module";

const config = {
  "compat/compat": "error",
};

// browserslist as eslint-plugin-compat resolves it, so both read the same
// config files.
const requireFromCompat = createRequire(
  createRequire(import.meta.url).resolve("eslint-plugin-compat")
);

const browserslist = requireFromCompat("browserslist");

const projectSetsTargets = () => {
  if (process.env.BROWSERSLIST || process.env.BROWSERSLIST_CONFIG) {
    return true;
  }

  try {
    return browserslist.findConfig(process.cwd()) !== undefined;
  } catch {
    // A config browserslist can't read is still the project's; the plugin
    // reports the error.
    return true;
  }
};

/**
 * Without browserslist targets, eslint-plugin-compat checks against
 * browserslist's `defaults`, which include Opera Mini and Chrome 109, so
 * `fetch`, `URL` and `Array#toSorted()` (which unicorn/no-array-sort asks
 * for) all fail. A project that sets no targets is checked against Baseline
 * Widely available browsers instead. Only then: the plugin adds ESLint's
 * targets to a browserslist config's rather than replacing them, so setting
 * them next to the project's own would widen its targets. The config is
 * looked for from the directory ESLint runs in, as browserslist does.
 */
export const compatSettings = projectSetsTargets()
  ? {}
  : { browsers: "baseline widely available" };

export default config;
