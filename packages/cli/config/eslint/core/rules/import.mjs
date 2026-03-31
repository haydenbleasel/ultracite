import { rules } from "eslint-plugin-import-x";

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`import-x/${key}`, "error"])
);

const overrideRules = {
  "import-x/enforce-node-protocol-usage": ["error", "always"],
  "import-x/exports-last": "off",
  "import-x/extensions": "off",
  "import-x/group-exports": "off",
  "import-x/max-dependencies": "off",
  "import-x/no-default-export": "off",
  "import-x/no-internal-modules": "off",
  "import-x/no-named-as-default": "off",
  "import-x/no-named-export": "off",
  "import-x/no-namespace": "off",
  "import-x/no-relative-parent-imports": "off",
  "import-x/no-unassigned-import": "off",
  "import-x/no-unresolved": "off",
  "import-x/order": [
    "error",
    {
      groups: [
        "builtin",
        "external",
        "internal",
        "parent",
        "sibling",
        "index",
        "object",
        "type",
      ],
    },
  ],
  "import-x/prefer-default-export": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
