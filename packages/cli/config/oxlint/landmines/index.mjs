import { defineConfig } from "oxlint";

// @interfere/landmines (https://github.com/interfere-inc/landmines) is a set
// of Oxlint rules for the shortcuts a coding agent takes to get a green
// check: mocking the thing under test, sleeping until a race usually goes its
// way, retrying a flake, raising a timeout, and narrating the diff in
// comments. Each message says what to do instead.
//
// This preset is opt-in: extend it alongside core (and any framework preset)
// only when you want these conventions and accept the extra dependency plus
// the slower JS-plugin lint pass. Install the plugin in your project, then
// extend the preset:
//
//   npm install -D @interfere/landmines
//
//   import { defineConfig } from "oxlint";
//   import core from "ultracite/oxlint/core";
//   import landmines from "ultracite/oxlint/landmines";
//
//   export default defineConfig({
//     env: core.env,
//     extends: [core, landmines],
//     ignorePatterns: core.ignorePatterns,
//     jsPlugins: landmines.jsPlugins,
//   });
//
// `jsPlugins: landmines.jsPlugins` re-declares the plugin package on the root
// config: oxlint loads it from the extended preset either way, but dependency
// analyzers such as Knip only read `jsPlugins` off the root and would
// otherwise flag the package as unused (#784).
//
// Every rule is enabled at "error", following the upstream recommended
// configuration. The rules are opinionated about more than tests:
//
// - landmines-style/no-comments leaves no way to write the comment core's
//   no-empty and no-fallthrough accept as an escape, so restructure the code
//   instead. It also rejects the `SAFETY:` comment that
//   anti-slop/require-safety-comment-for-type-assertion demands, so a type
//   assertion cannot pass both presets
//   (https://github.com/interfere-inc/landmines/issues/4). Turn one of the
//   two rules off when extending both.
// - landmines-structure/test-file-names wants `.test.ts`, `.fixture.ts` and
//   `.test-utils.ts`, and rejects `.spec.ts` and `__tests__` directories.
//   Turn it off for a framework whose convention is `.spec.ts` (Playwright,
//   Cypress, Angular, NestJS).
// - landmines-types/no-explicit-return-types reports every annotated return
//   type on a function with a body, other than a type predicate or `never`.
//
// no-fixed-sleep, strict-msw and no-flake-masking take an `allow` map of file
// path to exact violation count, for adopting them in an existing codebase.
export default defineConfig({
  jsPlugins: [
    {
      name: "landmines-structure",
      specifier: "@interfere/landmines/structure",
    },
    { name: "landmines-style", specifier: "@interfere/landmines/style" },
    { name: "landmines-testing", specifier: "@interfere/landmines/testing" },
    { name: "landmines-types", specifier: "@interfere/landmines/types" },
  ],
  rules: {
    // ── landmines-structure ──
    "landmines-structure/colocated-tests": "error",
    "landmines-structure/package-exports": "error",
    "landmines-structure/test-file-names": "error",

    // ── landmines-style ──
    "landmines-style/no-comments": "error",

    // ── landmines-testing ──
    "landmines-testing/no-fixed-sleep": "error",
    "landmines-testing/no-flake-masking": "error",
    "landmines-testing/no-test-doubles": "error",
    "landmines-testing/no-unsignaled-poll": "error",
    "landmines-testing/strict-msw": "error",

    // ── landmines-types ──
    "landmines-types/no-explicit-return-types": "error",
  },
});
