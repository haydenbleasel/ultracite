/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import nextPlugin from "@next/eslint-plugin-next";
import reactDoctor from "eslint-plugin-react-doctor";

import nextRules from "./rules/next.mjs";
import reactDoctorRules from "./rules/react-doctor.mjs";

const next = [
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    plugins: {
      "@next/next": nextPlugin,
      "react-doctor": reactDoctor,
    },
    rules: {
      ...nextRules,
      ...reactDoctorRules,
    },
  },
];

export default next;
