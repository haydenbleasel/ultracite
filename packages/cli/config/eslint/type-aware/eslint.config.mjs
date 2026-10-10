/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import { typeAwareBaseRules } from "../core/rules/eslint-typescript.mjs";
import { typeCheckedRules as sonarjsTypeCheckedRules } from "../core/rules/sonarjs.mjs";
import { typeCheckedRules } from "../core/rules/typescript.mjs";
import { typeCheckedRules as unicornTypeCheckedRules } from "../core/rules/unicorn.mjs";

// The @typescript-eslint, SonarJS and Unicorn rules that need type
// information, layered on core (which registers the plugins and parser for
// these files). They are opt-in, like Oxlint's type-aware rules, because
// every file then needs a tsconfig and linting builds a TypeScript program.
// Framework presets come after this one, so the component presets can switch
// these rules off again for script blocks no tsconfig can place.
const typeAware = [
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parserOptions: {
        // The project service finds the nearest tsconfig for each file, so
        // solution-style configs (`"files": []` plus `references`, as in the
        // Vite templates) and monorepo packages get type information. A
        // fixed `project: "./tsconfig.json"` failed every file in those
        // layouts.
        projectService: true,
      },
    },
    rules: {
      ...typeAwareBaseRules,
      ...typeCheckedRules,
      ...sonarjsTypeCheckedRules,
      ...unicornTypeCheckedRules,
    },
  },
];

export default typeAware;
