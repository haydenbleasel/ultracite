/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactDoctor from "eslint-plugin-react-doctor";
import reactHooks from "eslint-plugin-react-hooks";

import jsxA11yRules from "./rules/jsx-a11y.mjs";
import reactDoctorRules from "./rules/react-doctor.mjs";
import reactHooksRules from "./rules/react-hooks.mjs";
import reactRules from "./rules/react.mjs";

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
      "jsx-a11y": jsxA11y,
      react,
      "react-doctor": reactDoctor,
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactRules,
      ...reactHooksRules,
      ...jsxA11yRules,
      ...reactDoctorRules,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];

export default config;
