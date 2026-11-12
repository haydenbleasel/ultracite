// Every non-nursery jsx-a11y rule oxlint implements, with decisions matching
// the ESLint presets. The Solid and Qwik presets, whose components are JSX
// too, enable the same rules.
const jsxA11yRules = {
  "jsx-a11y/alt-text": "error",
  "jsx-a11y/anchor-ambiguous-text": "error",
  "jsx-a11y/anchor-has-content": "error",
  "jsx-a11y/anchor-is-valid": "error",
  "jsx-a11y/aria-activedescendant-has-tabindex": "error",
  "jsx-a11y/aria-props": "error",
  "jsx-a11y/aria-proptypes": "error",
  // A `role` prop on a component isn't an ARIA role
  // (`<Message role="assistant">`), so only DOM elements are checked.
  "jsx-a11y/aria-role": ["error", { ignoreNonDOM: true }],
  "jsx-a11y/aria-unsupported-elements": "error",
  "jsx-a11y/autocomplete-valid": "error",
  "jsx-a11y/click-events-have-key-events": "error",
  "jsx-a11y/control-has-associated-label": "error",
  "jsx-a11y/heading-has-content": "error",
  "jsx-a11y/html-has-lang": "error",
  "jsx-a11y/iframe-has-title": "error",
  "jsx-a11y/img-redundant-alt": "error",
  "jsx-a11y/interactive-supports-focus": "error",
  // Count the usual design-system components (shadcn/ui and similar) as
  // labels and controls, and look one level deeper than the default 2, so a
  // control wrapped in two elements inside its label is still found.
  "jsx-a11y/label-has-associated-control": [
    "error",
    {
      controlComponents: ["Input", "Select", "Textarea", "Checkbox", "Radio"],
      depth: 3,
      labelComponents: ["Label"],
    },
  ],
  "jsx-a11y/lang": "error",
  "jsx-a11y/media-has-caption": "error",
  "jsx-a11y/mouse-events-have-key-events": "error",
  "jsx-a11y/no-access-key": "error",
  "jsx-a11y/no-aria-hidden-on-focusable": "error",
  // Off on purpose: autofocus is a deliberate UX choice (a waitlist or
  // search field that's ready to type into), and the rule can't tell that
  // from a harmful use.
  "jsx-a11y/no-autofocus": "off",
  "jsx-a11y/no-distracting-elements": "error",
  "jsx-a11y/no-interactive-element-to-noninteractive-role": "error",
  "jsx-a11y/no-noninteractive-element-interactions": "error",
  "jsx-a11y/no-noninteractive-element-to-interactive-role": "error",
  "jsx-a11y/no-noninteractive-tabindex": "error",
  "jsx-a11y/no-redundant-roles": "error",
  "jsx-a11y/no-static-element-interactions": "error",
  "jsx-a11y/prefer-tag-over-role": "error",
  "jsx-a11y/role-has-required-aria-props": "error",
  "jsx-a11y/role-supports-aria-props": "error",
  "jsx-a11y/scope": "error",
  "jsx-a11y/tabindex-no-positive": "error",
};

export default jsxA11yRules;
