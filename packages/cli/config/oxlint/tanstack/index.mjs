import { defineConfig } from "oxlint";

export default defineConfig({
  overrides: [
    {
      files: ["**/routes/**/*.{tsx,ts}", "**/app/routes/**/*.{tsx,ts}"],
      rules: {
        // File routes are mutually recursive: `Route` references the component
        // via `component`, and the component calls `Route.useParams()` etc.
        // No declaration order satisfies the rule, and `tsc` still catches
        // real temporal dead zone crashes (TS2448).
        "no-use-before-define": "off",
        "unicorn/filename-case": "off",
      },
    },
    {
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
    // exemption cannot cover them. The TanStack ESLint plugins'
    // `*-property-order` rules enforce the inference-safe order instead.
    "sort-keys": "off",
  },
});
