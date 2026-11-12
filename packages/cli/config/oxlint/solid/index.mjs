import { defineConfig } from "oxlint";

import jsxA11yRules from "../react/jsx-a11y.mjs";

// Oxlint has no Solid plugin. Solid components are JSX, so the preset enables
// the jsx-a11y rules, with the React preset's decisions.
//
// The rules that look at event handlers (click-events-have-key-events,
// mouse-events-have-key-events, interactive-supports-focus,
// no-static-element-interactions and no-noninteractive-element-interactions)
// only know the camelCase names (`onClick`). They don't see Solid's
// `on:click` or lowercase `onclick`, so they say nothing about an element
// that only has those. They stay on: camelCase is what most Solid code
// writes, and the other forms get checked once Oxlint knows them.
export default defineConfig({
  plugins: ["jsx-a11y"],
  rules: {
    ...jsxA11yRules,
    // Off until Oxlint reads `settings` from an extended config
    // (https://github.com/oxc-project/oxc/issues/28047). Solid writes a
    // label's target as `for`, and the rule only accepts that through
    // `settings["jsx-a11y"].attributes`, which a preset can't set, so from
    // here it would report every `<label for="…">`. To turn it on, set both
    // on the root config:
    //   rules: { "jsx-a11y/label-has-associated-control": "error" },
    //   settings: { "jsx-a11y": { attributes: { for: ["htmlFor", "for"] } } },
    "jsx-a11y/label-has-associated-control": "off",
  },
});
