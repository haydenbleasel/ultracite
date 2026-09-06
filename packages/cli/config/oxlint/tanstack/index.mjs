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
        // Route option types are order-sensitive (`head`/`component` infer
        // `loaderData` from properties declared before them), so alphabetical
        // ordering conflicts with tanstack-start-route-property-order.
        "sort-keys": "off",
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
});
