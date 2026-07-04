import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["react", "react-perf", "jsx-a11y"],
  rules: {
    "jsx-a11y/control-has-associated-label": "error",
    "jsx-a11y/interactive-supports-focus": "error",
    "jsx-a11y/no-autofocus": "off",
    "jsx-a11y/no-interactive-element-to-noninteractive-role": "error",
    "jsx-a11y/no-noninteractive-element-interactions": "error",
    "jsx-a11y/no-noninteractive-element-to-interactive-role": "error",
    "react-perf/jsx-no-jsx-as-prop": "off",
    "react-perf/jsx-no-new-array-as-prop": "off",
    "react-perf/jsx-no-new-object-as-prop": "off",
    "react/forbid-component-props": "off",
    "react/jsx-boolean-value": "off",
    "react/jsx-filename-extension": "off",
    "react/jsx-max-depth": "off",
    "react/jsx-no-literals": "off",
    "react/jsx-props-no-spreading": "off",

    "react/no-multi-comp": "off",
    "react/no-object-type-as-default-prop": "error",
    "react/no-unknown-property": "off",
    "react/no-unstable-nested-components": "error",
    "react/only-export-components": "off",

    "react/react-compiler": "error",
    "react/react-in-jsx-scope": "off",
  },
});
