import { defineConfig } from "oxlint";

import { ROUTE_FILE_GLOB } from "../../shared/route-filenames.mjs";

export default defineConfig({
  overrides: [
    {
      files: [ROUTE_FILE_GLOB],
      rules: {
        // File-based routes encode the URL in the filename (`__root.tsx`,
        // `$.tsx`, `posts.$postId.tsx`, `{-$slug}.tsx`). no-use-before-define
        // stays on here with core's `variables: false`: a route whose
        // `component` is declared below it passes when the component only
        // reads `Route` inside its body, and a route that reads the component
        // before its declaration is reported.
        "unicorn/filename-case": "off",
      },
    },
    {
      // TanStack Router's generated route tree. The shared ignore list
      // already skips `**/*.gen.*`, but oxlint does not apply ignorePatterns
      // from extended configs, so this still matters for configs that do not
      // re-declare `ignorePatterns: core.ignorePatterns`.
      files: ["**/routeTree.gen.ts"],
      rules: {
        "unicorn/filename-case": "off",
        "unicorn/no-abusive-eslint-disable": "off",
      },
    },
  ],
});
