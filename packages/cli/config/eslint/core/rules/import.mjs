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
  // Reports every file that mostly re-exports, which is what a package's
  // entry point has to be. Off like unicorn/no-barrel-files; the oxlint
  // preset keeps oxc/no-barrel-file, which only reports very large barrels.
  "import-x/avoid-barrel-files": "off",
  // Reports each import of a barrel whose module graph passes 20 modules.
  // Off because the barrel rules follow the oxlint preset, where
  // oxc/no-barrel-file reports the barrel file itself, and only past 100
  // modules: a different check with a different limit.
  "import-x/avoid-importing-barrel-files": "off",
  // Off like import-x/no-namespace: libraries such as Zod and Radix document
  // `import * as` as their API, and bundlers tree-shake member access on a
  // namespace.
  "import-x/avoid-namespace-import": "off",
  // Reports every `export * from`, however small the module. Off like
  // Biome's noReExportAll; the oxlint preset only reports very large
  // barrels.
  "import-x/avoid-re-export-all": "off",
  "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],
  // Asks for a webpack magic comment on every dynamic import(), which means
  // nothing to any other bundler. oxlint has no version of it.
  "import-x/dynamic-import-chunkname": "off",
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
  // No-op under ESLint 10 (the FileEnumerator API it needs was removed)
  // and it prints a warning on every run while enabled.
  "import-x/no-unused-modules": "off",
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
