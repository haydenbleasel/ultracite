import { defineConfig } from "oxlint";

// Runs eslint-plugin-github through oxlint's JS plugin support to close
// the gap with the ESLint preset. Rules that require type information are
// not supported by the JS plugin bridge and are excluded.
export default defineConfig({
  jsPlugins: [{ name: "github", specifier: "eslint-plugin-github" }],
  rules: {
    "github/a11y-aria-label-is-well-formatted": "error",
    "github/a11y-no-title-attribute": "error",
    "github/a11y-no-visually-hidden-interactive-element": "error",
    "github/a11y-role-supports-aria-props": "error",
    "github/a11y-svg-has-accessible-name": "error",
    "github/array-foreach": "error",
    "github/async-currenttarget": "error",
    "github/async-preventdefault": "error",
    "github/authenticity-token": "error",
    "github/filenames-match-regex": "error",
    "github/get-attribute": "error",
    "github/js-class-name": "error",
    "github/no-blur": "error",
    "github/no-d-none": "error",
    // Conflicts with unicorn/prefer-dom-node-dataset, which is the benchmark.
    "github/no-dataset": "off",
    "github/no-dynamic-script-tag": "error",
    "github/no-implicit-buggy-globals": "error",
    "github/no-inner-html": "error",
    "github/no-innerText": "error",
    "github/no-then": "error",
    "github/no-useless-passive": "error",
    "github/prefer-observers": "error",
    "github/require-passive-events": "error",
    // Mirrors the ESLint preset.
    "github/unescaped-html-literal": "off",
  },
});
