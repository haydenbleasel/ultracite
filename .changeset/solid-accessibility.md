---
"ultracite": minor
---

The Oxlint and ESLint `solid` presets now lint Solid's JSX for accessibility, with the same `jsx-a11y` rules, severities and options as the `react` presets. Until now a Solid project got no accessibility checks on either linter, because the rules lived in the `react` presets only.

Solid projects on Oxlint and ESLint will see new errors. Thirty-four rules are on at `error` in each, covering missing `alt` text, labels and controls that aren't associated, click and mouse handlers with no keyboard equivalent, handlers on non-interactive elements, invalid ARIA roles and attributes, media without captions, and more. Measured on three open-source Solid codebases, the rules that report most are `jsx-a11y/no-static-element-interactions`, `jsx-a11y/control-has-associated-label`, `jsx-a11y/click-events-have-key-events` and `jsx-a11y/alt-text`, and on Oxlint `jsx-a11y/prefer-tag-over-role`.

- Solid writes `class` and `for` where React writes `className` and `htmlFor`. The ESLint preset tells the label rules that a label's target is `for`, so `<label for="email">` beside `<input id="email" />` passes, and a label with no control is still reported. No rule reads `className`.
- On Oxlint, `jsx-a11y/label-has-associated-control` is off. Oxlint only accepts `for` through `settings["jsx-a11y"].attributes`, and it doesn't read `settings` from a preset ([oxc-project/oxc#28047](https://github.com/oxc-project/oxc/issues/28047)), so the rule would report every `<label for="…">`. To turn it on, set `"jsx-a11y/label-has-associated-control": "error"` in `rules` and `"jsx-a11y": { attributes: { for: ["htmlFor", "for"] } }` in `settings` in your own `oxlint.config.ts`.
- The rules that look at event handlers know `onClick`, and on ESLint `onclick`. They don't see Solid's `on:click`, or on Oxlint lowercase `onclick`, so an element that only has a handler in those forms isn't checked for a keyboard equivalent. An element that mixes the forms, such as `onClick` with `on:keydown`, is reported as having no key handler.
- The rules can't see content set through `innerHTML` or `textContent`, so `<h1 innerHTML={title} />` is reported as an empty heading, as an element React fills with `dangerouslySetInnerHTML` is not.
- `jsx-a11y/no-autofocus` is off, as it is in the React presets, and on ESLint so is `jsx-a11y/prefer-tag-over-role`, which crashes on an object-valued `role` ([jsx-eslint/eslint-plugin-jsx-a11y#1102](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1102)).

`ultracite init` installs `eslint-plugin-jsx-a11y` for Solid projects that choose ESLint. Existing projects get it from `ultracite upgrade`, which installs every plugin the presets in your ESLint config load, and `ultracite doctor` reports it as missing until then. Oxlint's rules are built in, so there's nothing to install. Biome's accessibility rules already run from its core preset, so it doesn't change.
