import plugin from "eslint-plugin-vuejs-accessibility";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`vuejs-accessibility/${key}`, "error"])
);

const overrideRules = {
  // A `role` prop on a component isn't an ARIA role
  // (`<AiMessage role="assistant">`), so only DOM elements are checked.
  "vuejs-accessibility/aria-role": ["error", { ignoreNonDOM: true }],
  // The closest the rule gets to the React presets' options for
  // jsx-a11y/label-has-associated-control. By default it wants a label to
  // both wrap its control and point at it with `for`, which reports correct
  // markup: either one associates the two. `allowChildren` lets a `<slot />`
  // stand for the control, as `{children}` does in JSX. Element names are
  // compared in kebab case, so `<Label>`, `<Input>`, `<Select>` and
  // `<Textarea>` already count as their HTML elements, and the search for a
  // nested control has no depth limit.
  "vuejs-accessibility/label-has-for": [
    "error",
    {
      allowChildren: true,
      controlComponents: ["Checkbox", "Radio"],
      required: { some: ["nesting", "id"] },
    },
  ],
  // Off on purpose: autofocus is a deliberate UX choice (a waitlist or search
  // field that's ready to type into), and the rule can't tell that from a
  // harmful use.
  "vuejs-accessibility/no-autofocus": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
