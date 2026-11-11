import { defineConfig } from "oxlint";

import { ROUTE_FILE_GLOB } from "../../shared/route-filenames.mjs";

export default defineConfig({
  overrides: [
    {
      files: [ROUTE_FILE_GLOB],
      rules: {
        // File routes are mutually recursive: `Route` references the component
        // via `component`, and the component calls `Route.useParams()` etc.
        // With `func-style` making the component a `const`, no declaration
        // order satisfies the rule. `tsc` reports a direct read above the
        // declaration (TS2448) in TypeScript route files only, and misses a
        // crash through a helper, a callback or an import cycle.
        "no-use-before-define": "off",
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
  rules: {
    // TanStack option objects are order-sensitive. TypeScript infers the
    // generic parameters of `createFileRoute`, `useMutation`,
    // `mutationOptions`, `useInfiniteQuery` etc. from context-sensitive
    // callbacks in source order, so alphabetical sorting breaks inference:
    // `head`/`component` lose `loaderData`, and `onError`/`onSettled` see
    // the `onMutate` context as `{}`. Query and mutation options are declared
    // anywhere (hooks, components, colocated files), so a path-scoped
    // exemption cannot cover them. Only the ESLint preset has replacements,
    // the TanStack plugins' `*-property-order` rules. Here,
    // `ultracite/oxlint/tanstack/js-plugins` adds
    // `react-doctor/tanstack-start-route-property-order` and nothing checks
    // the order of query or mutation options.
    "sort-keys": "off",
  },
});
