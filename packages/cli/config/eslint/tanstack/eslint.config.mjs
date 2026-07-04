/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import query from "@tanstack/eslint-plugin-query";
import router from "@tanstack/eslint-plugin-router";
import start from "@tanstack/eslint-plugin-start";
import reactDoctor from "eslint-plugin-react-doctor";

import queryRules from "./rules/query.mjs";
import reactDoctorRules from "./rules/react-doctor.mjs";
import routerRules from "./rules/router.mjs";
import startRules from "./rules/start.mjs";

const config = [
  {
    files: ["**/*.jsx", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
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
];

export default config;
