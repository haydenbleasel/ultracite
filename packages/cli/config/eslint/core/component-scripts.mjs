import typescript from "@typescript-eslint/eslint-plugin";

import {
  routeFileConfigs,
  scriptConfig,
  typescriptConfig,
} from "./eslint.config.mjs";

/**
 * Core's rules for the scripts inside single-file components (.vue, .svelte,
 * .astro), which core's own globs don't match. The framework presets add
 * these after registering their parser, which reads each script through
 * the TypeScript parser, so the TypeScript rules apply too. Rules that
 * need type information are off: the project service can't place a script
 * block in a tsconfig, as with Astro's client-side scripts. Core's route
 * and page filename exceptions follow, since these configs come after core's
 * and would otherwise switch the filename rule back on for `+page.svelte`.
 *
 * @param {string[]} files Globs for the component files.
 */
const componentScripts = (files) => [
  {
    files,
    languageOptions: {
      globals: scriptConfig.languageOptions.globals,
    },
    plugins: scriptConfig.plugins,
    rules: scriptConfig.rules,
    settings: scriptConfig.settings,
  },
  {
    files,
    plugins: typescriptConfig.plugins,
    rules: {
      ...typescriptConfig.rules,
      ...typescript.configs["flat/disable-type-checked"].rules,
    },
  },
  ...routeFileConfigs,
];

export default componentScripts;
