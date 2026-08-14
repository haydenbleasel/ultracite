import { fileURLToPath } from "node:url";

import { defineConfig } from "oxlint";

// The anti-slop plugin (https://github.com/dmmulroy/anti-slop) rejects
// low-evidence, low-signal TypeScript and JavaScript patterns — unjustified
// type assertions, `unknown` leaking through signatures, Reflect-based
// property access, module mocking, and similar escape hatches. Upstream is
// deliberately not published to npm (its distribution model is "copy the
// source into your repo"), so Ultracite ships a self-contained bundled build
// in plugin.mjs — see license.md for attribution and
// scripts/vendor-anti-slop.ts for how it is regenerated.
//
// This preset is opt-in: extend it alongside core (and any framework preset)
// only when you want these stricter rules and accept the slower JS-plugin
// lint pass. Nothing needs to be installed beyond ultracite itself:
//
//   import { defineConfig } from "oxlint";
//   import core from "ultracite/oxlint/core";
//   import antiSlop from "ultracite/oxlint/anti-slop";
//
//   export default defineConfig({
//     extends: [core, antiSlop],
//     ignorePatterns: core.ignorePatterns,
//   });
//
// The specifier is an absolute path computed from this module's location so
// the bundled plugin loads regardless of how the consuming project resolves
// packages (npm/pnpm/bun, workspaces, this repo's own tests).
export default defineConfig({
  jsPlugins: [
    {
      name: "anti-slop",
      specifier: fileURLToPath(new URL("plugin.mjs", import.meta.url)),
    },
  ],
  rules: {
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
  },
});
