import { defineConfig } from "oxlint";

// Every non-nursery nextjs rule oxlint implements is listed explicitly
// (mirroring the core config's philosophy), with decisions matching the
// ESLint next preset.
export default defineConfig({
  jsPlugins: [
    { name: "react-doctor", specifier: "oxlint-plugin-react-doctor" },
  ],
  overrides: [
    {
      files: ["**/next-env.d.ts"],
      rules: {
        "import/no-unassigned-import": "off",
      },
    },
  ],
  plugins: ["nextjs"],
  rules: {
    "nextjs/google-font-display": "error",
    "nextjs/google-font-preconnect": "error",
    "nextjs/inline-script-id": "error",
    "nextjs/next-script-for-ga": "error",
    "nextjs/no-assign-module-variable": "error",
    "nextjs/no-async-client-component": "error",
    "nextjs/no-before-interactive-script-outside-document": "error",
    "nextjs/no-css-tags": "error",
    "nextjs/no-document-import-in-page": "error",
    "nextjs/no-duplicate-head": "error",
    "nextjs/no-head-element": "error",
    "nextjs/no-head-import-in-document": "error",
    "nextjs/no-html-link-for-pages": "error",
    "nextjs/no-img-element": "error",
    "nextjs/no-page-custom-font": "error",
    "nextjs/no-script-component-in-head": "error",
    "nextjs/no-styled-jsx-in-document": "error",
    "nextjs/no-sync-scripts": "error",
    "nextjs/no-title-in-document-head": "error",
    "nextjs/no-typos": "error",
    "nextjs/no-unwanted-polyfillio": "error",

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
