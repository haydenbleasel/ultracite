import { defineConfig } from "oxlint";

import jsxA11yRules from "./jsx-a11y.mjs";

// Every non-nursery react, react-perf, and jsx-a11y rule oxlint implements
// is listed explicitly (mirroring the core config's philosophy), with
// decisions matching the ESLint react preset.
export default defineConfig({
  plugins: ["react", "react-perf", "jsx-a11y"],
  rules: {
    ...jsxA11yRules,
    // Inline JSX/object/array/function props are idiomatic modern React;
    // the react-doctor rules (opt-in js-plugins preset) cover the cases that
    // actually hurt.
    "react-perf/jsx-no-jsx-as-prop": "off",
    "react-perf/jsx-no-new-array-as-prop": "off",
    "react-perf/jsx-no-new-function-as-prop": "off",
    "react-perf/jsx-no-new-object-as-prop": "off",
    "react/button-has-type": "error",
    "react/capitalized-calls": "error",
    "react/checked-requires-onchange-or-readonly": "error",
    "react/display-name": "error",
    "react/error-boundaries": "error",
    // An error by policy, though React's own config warns: the report is
    // usually right about the array.
    "react/exhaustive-deps": "error",
    "react/exhaustive-effect-dependencies": "error",
    "react/forbid-component-props": "off",
    "react/forbid-dom-props": "error",
    "react/forbid-elements": "error",
    // forwardRef is deprecated in React 19; react-doctor/no-react19-deprecated-apis
    // (opt-in js-plugins preset) covers it.
    "react/forward-ref-uses-ref": "off",
    // Off: its fix turns a hoisted `function` component into a `const`, which
    // throws when something above it reads the component at load (a route
    // object, say), and its fix for an unnamed component produces code the
    // rule reports again. Core's func-style already asks for expressions and
    // has no fix; it leaves `export default function Page()` alone.
    "react/function-component-definition": "off",
    "react/globals": "error",
    "react/hook-use-state": "error",
    "react/hooks": "error",
    "react/iframe-missing-sandbox": "error",
    "react/immutability": "error",
    "react/incompatible-library": "error",
    "react/invariant": "error",
    "react/jsx-boolean-value": "off",
    "react/jsx-curly-brace-presence": "error",
    "react/jsx-filename-extension": "off",
    "react/jsx-fragments": "error",
    "react/jsx-handler-names": "error",
    "react/jsx-key": "error",
    "react/jsx-max-depth": "off",
    "react/jsx-no-comment-textnodes": "error",
    "react/jsx-no-constructed-context-values": "error",
    "react/jsx-no-duplicate-props": "error",
    "react/jsx-no-literals": "off",
    "react/jsx-no-script-url": "error",
    // Forms too, as Biome's noBlankTarget checks them.
    "react/jsx-no-target-blank": ["error", { forms: true }],
    "react/jsx-no-undef": "error",
    "react/jsx-no-useless-fragment": "error",
    "react/jsx-pascal-case": "error",
    "react/jsx-props-no-spread-multi": "error",
    "react/jsx-props-no-spreading": "off",
    "react/memo-dependencies": "error",
    // Off in the ESLint preset; react-doctor/no-random-key (opt-in js-plugins
    // preset) covers the dangerous cases.
    "react/no-array-index-key": "off",
    "react/no-children-prop": "error",
    "react/no-clone-element": "error",
    "react/no-danger": "error",
    "react/no-danger-with-children": "error",
    "react/no-deriving-state-in-effects": "error",
    "react/no-did-mount-set-state": "error",
    "react/no-did-update-set-state": "error",
    "react/no-direct-mutation-state": "error",
    "react/no-find-dom-node": "error",
    "react/no-is-mounted": "error",
    "react/no-multi-comp": "off",
    "react/no-namespace": "error",
    "react/no-object-type-as-default-prop": "error",
    "react/no-react-children": "error",
    "react/no-redundant-should-component-update": "error",
    "react/no-render-return-value": "error",
    "react/no-set-state": "error",
    "react/no-string-refs": "error",
    "react/no-this-in-sfc": "error",
    "react/no-unescaped-entities": "error",
    "react/no-unknown-property": "off",
    "react/no-unsafe": "error",
    "react/no-unstable-nested-components": "error",
    "react/no-will-update-set-state": "error",
    "react/only-export-components": "off",
    "react/prefer-es6-class": "error",
    "react/prefer-function-component": "error",
    "react/preserve-manual-memoization": "error",
    "react/purity": "error",
    "react/react-in-jsx-scope": "off",
    "react/refs": "error",
    "react/rule-suppression": "error",
    "react/rules-of-hooks": "error",
    "react/self-closing-comp": "error",
    "react/set-state-in-effect": "error",
    "react/set-state-in-render": "error",
    "react/state-in-constructor": "error",
    "react/static-components": "error",
    "react/style-prop-object": "error",
    "react/syntax": "error",
    "react/todo": "error",
    "react/unsupported-syntax": "error",
    "react/use-memo": "error",
    "react/void-dom-elements-no-children": "error",
    "react/void-use-memo": "error",
  },
});
