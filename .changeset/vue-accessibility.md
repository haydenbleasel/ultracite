---
"ultracite": minor
---

The ESLint `vue` preset now lints Vue templates for accessibility with [`eslint-plugin-vuejs-accessibility`](https://github.com/vue-a11y/eslint-plugin-vuejs-accessibility). Until now a `.vue` template got no accessibility checks on ESLint, because `eslint-plugin-vue` has none.

Vue projects on ESLint will see new errors. Twenty-one rules are on at `error`, covering missing `alt` text, form controls and labels that aren't associated, click and mouse handlers with no keyboard equivalent, handlers on non-interactive elements, invalid ARIA roles and attributes, media without captions, and more. Measured on three open-source Vue 3 apps, the rules that report most are `vuejs-accessibility/no-static-element-interactions`, `vuejs-accessibility/label-has-for`, `vuejs-accessibility/click-events-have-key-events` and `vuejs-accessibility/form-control-has-label`.

- `vuejs-accessibility/no-autofocus` is off, as `jsx-a11y/no-autofocus` is in the React presets. Autofocus is a deliberate UX choice (a waitlist or search field that's ready to type into), and the rule can't tell that from a harmful use.
- `vuejs-accessibility/label-has-for` accepts a label that either wraps its control or points at it with `for`. The plugin's default asks for both, which reports correct markup. It also counts `<Checkbox>` and `<Radio>` components as controls, and a `<slot />` inside a label as one.
- The rules can't see inside components. A heading or link whose only content is a component (`<h1><PageTitle /></h1>`) is reported as empty by `vuejs-accessibility/heading-has-content` and `vuejs-accessibility/anchor-has-content`. List those components in the rules' `accessibleChildren` option in your own config.

`ultracite init` installs `eslint-plugin-vuejs-accessibility` for Vue projects that choose ESLint. Existing projects get it from `ultracite upgrade`, which installs every plugin the presets in your ESLint config load, and `ultracite doctor` reports it as missing until then. Oxlint doesn't lint Vue templates, and Biome's accessibility rules already run from its core preset, so neither changes.

`aria-role` now checks DOM elements only, in the React presets of all three linters as well as the new Vue rules: a `role` prop on a component, such as `<Message role="assistant">`, is no longer reported as an invalid ARIA role.
