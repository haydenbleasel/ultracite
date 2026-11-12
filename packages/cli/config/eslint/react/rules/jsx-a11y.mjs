import plugin from "eslint-plugin-jsx-a11y";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`jsx-a11y/${key}`, "error"])
);

const overrideRules = {
  // The options eslint-plugin-jsx-a11y ships for this rule in its own
  // configs. Without them it reports every input, including one its label
  // wraps, which label-has-associated-control already checks.
  "jsx-a11y/control-has-associated-label": [
    "error",
    {
      ignoreElements: [
        "audio",
        "canvas",
        "embed",
        "input",
        "textarea",
        "tr",
        "video",
      ],
      ignoreRoles: [
        "grid",
        "listbox",
        "menu",
        "menubar",
        "radiogroup",
        "row",
        "tablist",
        "toolbar",
        "tree",
        "treegrid",
      ],
      includeRoles: ["alert", "dialog"],
    },
  ],
  "jsx-a11y/label-has-associated-control": [
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
  "jsx-a11y/no-autofocus": "off",
  // Off until the crash is fixed: it throws on an object-valued `role` prop
  // (`<Thing role={{ name: "admin" }} />`), which aborts the whole ESLint
  // run. https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1102
  "jsx-a11y/prefer-tag-over-role": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
