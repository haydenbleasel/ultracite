/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies */

import { fixupPluginRules } from "@eslint/compat";
import reactNativeMetaPlugin from "@react-native/eslint-plugin";
import reactNativePlugin from "eslint-plugin-react-native";

import reactNativeRules from "./rules/react-native.mjs";

const reactNative = [
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    languageOptions: {
      // React Native defines __DEV__ for development builds.
      globals: {
        __DEV__: "readonly",
      },
    },
    plugins: {
      "@react-native": reactNativeMetaPlugin,
      // eslint-plugin-react-native's rules still call context.getSourceCode(),
      // which ESLint 10 removed; fixupPluginRules puts it back.
      "react-native": fixupPluginRules(reactNativePlugin),
    },
    rules: reactNativeRules,
  },
];

export default reactNative;
