import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["react", "react-perf", "jsx-a11y"],
  rules: {
    "jsx-a11y/no-autofocus": "off",
    "react-perf/jsx-no-jsx-as-prop": "off",
    "react-perf/jsx-no-new-array-as-prop": "off",
    "react-perf/jsx-no-new-object-as-prop": "off",
    "react/jsx-boolean-value": "off",
    "react/jsx-filename-extension": "off",
    "react/jsx-max-depth": "off",
    "react/jsx-props-no-spreading": "off",

    "react/no-multi-comp": "off",
    "react/no-unknown-property": "off",
    "react/only-export-components": "off",

    "react/react-in-jsx-scope": "off",
  },
});
