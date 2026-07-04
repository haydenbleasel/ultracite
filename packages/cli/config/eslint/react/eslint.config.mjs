/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import eslintPrettier from "eslint-config-prettier";
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
      // Re-applied here because this config block merges after the core
      // one, which would otherwise re-enable the JSX formatting rules
      // that eslint-config-prettier turns off (several of them also
      // crash under ESLint 10).
      ...eslintPrettier.rules,
      // Kept enabled past eslint-config-prettier, mirroring the core config.
      curly: "error",
      "no-unexpected-multiline": "error",
    },
    settings: {
      react: {
        // "detect" calls the removed context.getFilename() under ESLint 10
        // and crashes every version-aware rule. The preset targets React
        // 19+ (see the react-doctor rules), so pin instead of detecting.
        version: "19.0.0",
      },
    },
  },
];

export default config;
