import { rules } from "eslint-plugin-import-x";

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`import-x/${key}`, "error"])
);

// Overrides mirror the oxlint core config (config/oxlint/core/index.mjs),
// which is the benchmark for rule decisions across linters.
const overrideRules = {
  "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],
  "import-x/exports-last": "off",
  "import-x/extensions": "off",
  "import-x/group-exports": "off",
  "import-x/max-dependencies": "off",
  "import-x/no-anonymous-default-export": "off",
  "import-x/no-commonjs": "off",
  "import-x/no-default-export": "off",
  "import-x/no-dynamic-require": "off",
  "import-x/no-internal-modules": "off",
  "import-x/no-named-export": "off",
  "import-x/no-namespace": "off",
  "import-x/no-nodejs-modules": "off",
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
  "import-x/unambiguous": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
