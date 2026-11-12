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

const tanstack = [
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
    },
  },
  {
    files: [ROUTE_FILE_GLOB],
    rules: {
      // File-based routes encode the URL in the filename (`__root.tsx`,
      // `$.tsx`, `posts.$postId.tsx`, `{-$slug}.tsx`). no-use-before-define
      // stays on here with core's `variables: false`: a route whose
      // `component` is declared below it passes when the component only reads
      // `Route` inside its body, and a route that reads the component before
      // its declaration is reported. Mirrors the oxlint tanstack preset.
      "unicorn/filename-case": "off",
    },
  },
];

export default tanstack;
