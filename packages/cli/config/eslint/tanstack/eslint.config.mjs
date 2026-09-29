/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import query from "@tanstack/eslint-plugin-query";
import router from "@tanstack/eslint-plugin-router";
import start from "@tanstack/eslint-plugin-start";
import reactDoctor from "eslint-plugin-react-doctor";

import { ROUTE_FILE_GLOB } from "../../shared/route-filenames.mjs";
import queryRules from "./rules/query.mjs";
import reactDoctorRules from "./rules/react-doctor.mjs";
import routerRules from "./rules/router.mjs";
import startRules from "./rules/start.mjs";

const config = [
  {
    // Query and router options are declared anywhere, including plain .ts
    // hooks and query-option modules, not only in components.
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    plugins: {
      "@tanstack/query": query,
      "@tanstack/router": router,
      "@tanstack/start": start,
      "react-doctor": reactDoctor,
    },
    rules: {
      ...queryRules,
      ...routerRules,
      ...startRules,
      ...reactDoctorRules,
      // TanStack option objects are order-sensitive. TypeScript infers the
      // generic parameters of `createFileRoute`, `useMutation`,
      // `mutationOptions`, `useInfiniteQuery` etc. from context-sensitive
      // callbacks in source order, so alphabetical sorting breaks inference:
      // `head`/`component` lose `loaderData`, and `onError`/`onSettled` see
      // the `onMutate` context as `{}`. Query and mutation options are
      // declared anywhere (hooks, components, colocated files), so a
      // path-scoped exemption cannot cover them. The `*-property-order` rules
      // above enforce the inference-safe order instead. Mirrors the oxlint
      // tanstack preset.
      "sort-keys": "off",
    },
  },
  {
    // These rules read TypeScript type information, which only the core
    // preset's TypeScript block provides. On JavaScript files they throw and
    // abort the whole ESLint run.
    files: ["**/*.{js,jsx,mjs,cjs}"],
    rules: {
      "@tanstack/start/no-async-client-component": "off",
      "@tanstack/start/no-client-code-in-server-component": "off",
    },
  },
  {
    files: [ROUTE_FILE_GLOB],
    rules: {
      // File routes are mutually recursive: `Route` references the component
      // via `component`, and the component calls `Route.useParams()` etc.
      // No declaration order satisfies the rule, and `tsc` still catches
      // real temporal dead zone crashes (TS2448). Mirrors the oxlint tanstack
      // preset.
      "@typescript-eslint/no-use-before-define": "off",
      "no-use-before-define": "off",
      // File-based routes encode the URL in the filename (`__root.tsx`,
      // `$.tsx`, `posts.$postId.tsx`, `{-$slug}.tsx`).
      "unicorn/filename-case": "off",
    },
  },
];

export default config;
