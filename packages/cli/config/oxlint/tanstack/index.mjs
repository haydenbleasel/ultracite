import { defineConfig } from "oxlint";

export default defineConfig({
  jsPlugins: [
    { name: "react-doctor", specifier: "oxlint-plugin-react-doctor" },
  ],
  overrides: [
    {
      files: ["**/routes/**/*.{tsx,ts}", "**/app/routes/**/*.{tsx,ts}"],
      rules: {
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
