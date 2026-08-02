import { defineConfig } from "oxlint";

// React Doctor's Next.js-specific rules. These live outside the base
// js-plugins preset because several of them fire on generic JSX (<img>, <a>,
// <script>) and recommend Next.js replacements, which is pure noise in
// non-Next projects. Extend this alongside js-plugins in Next.js apps:
//
//   import { defineConfig } from "oxlint";
//   import core from "ultracite/oxlint/core";
//   import next from "ultracite/oxlint/next";
//   import jsPlugins from "ultracite/oxlint/js-plugins";
//   import nextJsPlugins from "ultracite/oxlint/next/js-plugins";
//
//   export default defineConfig({
//     extends: [core, next, jsPlugins, nextJsPlugins],
//     ignorePatterns: core.ignorePatterns,
//   });
export default defineConfig({
  jsPlugins: [
    { name: "react-doctor", specifier: "oxlint-plugin-react-doctor" },
  ],
  rules: {
    "react-doctor/nextjs-async-client-component": "error",
    "react-doctor/nextjs-error-boundary-missing-use-client": "error",
    "react-doctor/nextjs-global-error-missing-html-body": "error",
    "react-doctor/nextjs-image-missing-sizes": "error",
    "react-doctor/nextjs-inline-script-missing-id": "error",
    "react-doctor/nextjs-missing-metadata": "error",
    "react-doctor/nextjs-no-a-element": "error",
    "react-doctor/nextjs-no-client-fetch-for-server-data": "error",
    "react-doctor/nextjs-no-client-side-redirect": "error",
    "react-doctor/nextjs-no-css-link": "error",
    "react-doctor/nextjs-no-default-export-in-route-handler": "error",
    "react-doctor/nextjs-no-edge-og-runtime": "error",
    "react-doctor/nextjs-no-font-link": "error",
    "react-doctor/nextjs-no-google-analytics-script": "error",
    "react-doctor/nextjs-no-head-import": "error",
    "react-doctor/nextjs-no-img-element": "error",
    "react-doctor/nextjs-no-native-script": "error",
    "react-doctor/nextjs-no-polyfill-script": "error",
    "react-doctor/nextjs-no-redirect-in-try-catch": "error",
    "react-doctor/nextjs-no-script-in-head": "error",
    "react-doctor/nextjs-no-side-effect-in-get-handler": "error",
    "react-doctor/nextjs-no-use-search-params-without-suspense": "error",
    "react-doctor/nextjs-no-vercel-og-import": "error",
  },
});
