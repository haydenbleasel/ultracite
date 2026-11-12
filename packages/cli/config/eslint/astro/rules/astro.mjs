import { rules } from "eslint-plugin-astro";

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`astro/${key}`, "error"])
);

const overrideRules = {
  // The same label and control components as the react preset.
  "astro/jsx-a11y/label-has-associated-control": [
    "error",
    {
      controlComponents: ["Input", "Select", "Textarea", "Checkbox", "Radio"],
      depth: 3,
      labelComponents: ["Label"],
    },
  ],
  // Off on purpose: autofocus is a deliberate UX choice (a waitlist or search
  // field that's ready to type into), and the rule can't tell that from a
  // harmful use.
  "astro/jsx-a11y/no-autofocus": "off",
  // Prettier owns formatting for .astro files.
  "astro/semi": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
