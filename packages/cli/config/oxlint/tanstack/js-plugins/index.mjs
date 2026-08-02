import { defineConfig } from "oxlint";

// React Doctor's TanStack Query/Router/Start rules. These live outside the
// base js-plugins preset because some of them fire on generic JSX (e.g. plain
// <a> elements) and recommend TanStack replacements, which is pure noise in
// non-TanStack projects. Extend this alongside js-plugins in TanStack apps:
//
//   import { defineConfig } from "oxlint";
//   import core from "ultracite/oxlint/core";
//   import tanstack from "ultracite/oxlint/tanstack";
//   import jsPlugins from "ultracite/oxlint/js-plugins";
//   import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";
//
//   export default defineConfig({
//     extends: [core, tanstack, jsPlugins, tanstackJsPlugins],
//     ignorePatterns: core.ignorePatterns,
//   });
export default defineConfig({
  jsPlugins: [
    { name: "react-doctor", specifier: "oxlint-plugin-react-doctor" },
  ],
  rules: {
    "react-doctor/query-destructure-result": "error",
    "react-doctor/query-mutation-missing-invalidation": "error",
    "react-doctor/query-no-query-in-effect": "error",
    "react-doctor/query-no-rest-destructuring": "error",
    "react-doctor/query-no-usequery-for-mutation": "error",
    "react-doctor/query-no-void-query-fn": "error",
    "react-doctor/query-stable-query-client": "error",
    "react-doctor/tanstack-start-get-mutation": "error",
    "react-doctor/tanstack-start-loader-parallel-fetch": "error",
    "react-doctor/tanstack-start-missing-head-content": "error",
    "react-doctor/tanstack-start-no-anchor-element": "error",
    "react-doctor/tanstack-start-no-direct-fetch-in-loader": "error",
    "react-doctor/tanstack-start-no-dynamic-server-fn-import": "error",
    "react-doctor/tanstack-start-no-navigate-in-render": "error",
    "react-doctor/tanstack-start-no-secrets-in-loader": "error",
    "react-doctor/tanstack-start-no-use-server-in-handler": "error",
    "react-doctor/tanstack-start-no-useeffect-fetch": "error",
    "react-doctor/tanstack-start-redirect-in-try-catch": "error",
    "react-doctor/tanstack-start-route-property-order": "error",
    "react-doctor/tanstack-start-server-fn-method-order": "error",
    "react-doctor/tanstack-start-server-fn-validate-input": "error",
  },
});
