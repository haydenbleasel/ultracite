/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import jsxA11y from "eslint-plugin-jsx-a11y";
import qwikPlugin from "eslint-plugin-qwik";

import { htmlAttributeSettings } from "../../shared/jsx-a11y.mjs";
import jsxA11yRules from "../react/rules/jsx-a11y.mjs";
import qwikRules from "./rules/qwik.mjs";

const qwik = [
  {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      // Qwik components are JSX, so they get the React preset's
      // accessibility rules, which eslint-plugin-qwik doesn't have. The
      // rules that look at event handlers (click-events-have-key-events,
      // mouse-events-have-key-events, interactive-supports-focus,
      // no-static-element-interactions and
      // no-noninteractive-element-interactions) only know React's names
      // (`onClick`). Qwik's end in `$` (`onClick$`), so they say nothing
      // about a Qwik handler: a `<div onClick$={…}>` isn't reported. They
      // stay on, since they report nothing wrong either, and start working
      // once the plugin knows the `$` names.
      "jsx-a11y": jsxA11y,
      qwik: qwikPlugin,
    },
    rules: {
      ...qwikRules,
      ...jsxA11yRules,
    },
    settings: {
      // Accepts `for` as a label's target, which is what Qwik writes.
      ...htmlAttributeSettings,
    },
  },
];

export default qwik;
