import { defineConfig } from "oxlint";

// gdp-ts (https://github.com/rauchg/gdp-ts) brings Ghosts of Departed Proofs
// to TypeScript: sensitive functions demand a proof about their exact
// arguments (`UserIsProjectAdmin<U, P>`), and only a trusted module in
// `proofs/` can mint one, so a skipped or mismatched authorization check is a
// compile error. TypeScript cannot stop a proof being forged with
// `{} as UserIsProjectAdmin<U, P>`; these rules close that gap.
//
// This preset is opt-in: extend it alongside core (and any framework preset)
// once the codebase uses @gdp-ts/core, which ships the plugin, so there is
// nothing extra to install:
//
//   import { defineConfig } from "oxlint";
//   import core from "ultracite/oxlint/core";
//   import gdp from "ultracite/oxlint/gdp";
//
//   export default defineConfig({
//     extends: [core, gdp],
//     ignorePatterns: core.ignorePatterns,
//   });
//
// It follows the upstream strict mode: outside the trusted modules, every
// type assertion except `as const` is an error, since the honest path never
// needs one. Upstream's strict `no-any` is left off because core's
// typescript/no-explicit-any already bans `any` everywhere. The file layout
// matches the upstream recipe — trusted modules in `proofs/`, branded-id
// constructors in `lib/ids.ts` — so add overrides with the same shape for a
// different layout.
//
// Core's no-redeclare stays on, so give the prover a different name from the
// proof interface (`const prover = defineProof("UserIsProjectAdmin")`)
// rather than the upstream recipe's shared name.
export default defineConfig({
  jsPlugins: [{ name: "gdp-ts", specifier: "@gdp-ts/core/lint/plugin" }],
  rules: {
    "gdp-ts/no-define-proof": "error",
    "gdp-ts/no-proof-assertion": "error",
    "gdp-ts/no-type-assertion": "error",
  },
  overrides: [
    {
      // Trusted modules mint proofs, so they may call defineProof and assert,
      // but must keep the prover private. A proof is declared as
      // `interface X<P> extends Proof<"X", [P]> {}`: upstream requires an
      // interface rather than a type alias (a distinct symbol per proof keeps
      // inference from mixing up names across a union of proofs), so empty
      // interfaces that extend a single type are allowed here.
      files: ["**/proofs/**"],
      rules: {
        "gdp-ts/no-define-proof": "off",
        "gdp-ts/no-exported-prover": "error",
        "gdp-ts/no-proof-assertion": "off",
        "gdp-ts/no-type-assertion": "off",
        "typescript/no-empty-interface": [
          "error",
          { allowSingleExtends: true },
        ],
        "typescript/no-empty-object-type": [
          "error",
          { allowInterfaces: "with-single-extends" },
        ],
      },
    },
    {
      // Branded-id constructors (`(id: string) => id as UserId`) are the one
      // assertion the honest path needs outside a trusted module.
      files: ["**/lib/ids.ts"],
      rules: {
        "gdp-ts/no-type-assertion": "off",
      },
    },
  ],
});
