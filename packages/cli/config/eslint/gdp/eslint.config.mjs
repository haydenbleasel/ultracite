/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import gdpTsPlugin from "@gdp-ts/core/lint/plugin";

// gdp-ts (https://github.com/rauchg/gdp-ts) makes authorization checks
// visible to the type checker; these rules stop proofs being forged with type
// assertions or minted outside the trusted modules in `proofs/`. Opt-in:
// spread it after core once the codebase uses @gdp-ts/core, which ships the
// plugin. Mirrors config/oxlint/gdp/index.mjs, which documents each choice.
const sourceFiles = ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"];
const typescriptFiles = ["**/*.{ts,tsx,mts,cts}"];

const gdp = [
  {
    files: sourceFiles,
    plugins: {
      "gdp-ts": gdpTsPlugin,
    },
    rules: {
      "gdp-ts/no-define-proof": "error",
      "gdp-ts/no-proof-assertion": "error",
      "gdp-ts/no-type-assertion": "error",
    },
  },
  {
    // Sensitive functions take proofs they never read at runtime
    // (`_proof: UserIsProjectAdmin<U, P>`). Oxlint's no-unused-vars ignores
    // `_`-prefixed arguments by default; typescript-eslint's does not.
    files: typescriptFiles,
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/proofs/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    rules: {
      "gdp-ts/no-define-proof": "off",
      "gdp-ts/no-exported-prover": "error",
      "gdp-ts/no-proof-assertion": "off",
      "gdp-ts/no-type-assertion": "off",
    },
  },
  {
    // @typescript-eslint rules can only be configured where core registers
    // the plugin. no-empty-interface is deprecated, so core leaves it off.
    files: ["**/proofs/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
    },
  },
  {
    files: ["**/lib/ids.ts"],
    rules: {
      "gdp-ts/no-type-assertion": "off",
    },
  },
];

export default gdp;
