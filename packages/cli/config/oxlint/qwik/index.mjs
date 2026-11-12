import { defineConfig } from "oxlint";

import jsxA11yRules from "../react/jsx-a11y.mjs";

// Oxlint has no Qwik plugin. Qwik components are JSX, so the preset enables
// the jsx-a11y rules, with the React preset's decisions.
//
// The rules that look at event handlers (click-events-have-key-events,
// mouse-events-have-key-events, interactive-supports-focus,
// no-static-element-interactions and no-noninteractive-element-interactions)
// only know React's names (`onClick`). Qwik's end in `$` (`onClick$`), so
// they say nothing about a Qwik handler: a `<div onClick$={…}>` isn't
// reported. They stay on, since they report nothing wrong either, and start
// working once Oxlint knows the `$` names.
export default defineConfig({
  plugins: ["jsx-a11y"],
  rules: {
    ...jsxA11yRules,
    // Off until Oxlint reads `settings` from an extended config
    // (https://github.com/oxc-project/oxc/issues/28047). Qwik writes a
    // label's target as `for`, and the rule only accepts that through
    // `settings["jsx-a11y"].attributes`, which a preset can't set, so from
    // here it would report every `<label for="…">`. To turn it on, set both
    // on the root config:
    //   rules: { "jsx-a11y/label-has-associated-control": "error" },
    //   settings: { "jsx-a11y": { attributes: { for: ["htmlFor", "for"] } } },
    "jsx-a11y/label-has-associated-control": "off",
  },
});
