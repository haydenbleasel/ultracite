import core from "../../../config/oxlint/core/index.mjs";
import { selectJsPlugins } from "../../../config/oxlint/js-plugins/index.mjs";

export default {
  extends: [core, selectJsPlugins(["jsdoc-js", "tsdoc"])],
  overrides: [
    {
      files: ["**/*.ts"],
      rules: { "no-unused-vars": "off" },
    },
  ],
};
