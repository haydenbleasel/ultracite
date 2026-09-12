import astro from "../../../config/oxlint/astro/index.mjs";
import core from "../../../config/oxlint/core/index.mjs";
import jsPlugins from "../../../config/oxlint/js-plugins/index.mjs";

export default {
  extends: [core, astro, jsPlugins],
};
