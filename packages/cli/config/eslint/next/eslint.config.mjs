/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import next from "@next/eslint-plugin-next";
import reactDoctor from "eslint-plugin-react-doctor";

import nextRules from "./rules/next.mjs";
import reactDoctorRules from "./rules/react-doctor.mjs";

const config = [
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    plugins: {
      "@next/next": next,
      "react-doctor": reactDoctor,
    },
    rules: {
      ...nextRules,
      ...reactDoctorRules,
    },
  },
];

export default config;
