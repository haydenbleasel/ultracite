/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import jsxA11y from "eslint-plugin-jsx-a11y";
import solidPlugin from "eslint-plugin-solid";

import { htmlAttributeSettings } from "../../shared/jsx-a11y.mjs";
import jsxA11yRules from "../react/rules/jsx-a11y.mjs";
import solidRules from "./rules/solid.mjs";

const solid = [
  {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      // Solid components are JSX, so they get the React preset's
      // accessibility rules, which eslint-plugin-solid doesn't have. The
      // rules that look at event handlers match `onClick` and `onclick`, and
      // don't see Solid's `on:click`, so they say nothing about an element
      // that only has that form. They stay on: the other forms are what most
      // Solid code writes.
      "jsx-a11y": jsxA11y,
      solid: solidPlugin,
    },
    rules: {
      ...solidRules,
      ...jsxA11yRules,
    },
    settings: {
      // Accepts `for` as a label's target, which is what Solid writes.
      ...htmlAttributeSettings,
    },
  },
];

export default solid;
