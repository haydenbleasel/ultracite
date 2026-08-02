import core from "../../../config/oxlint/core/index.mjs";
import jsPlugins from "../../../config/oxlint/js-plugins/index.mjs";
import nextJsPlugins from "../../../config/oxlint/next/js-plugins/index.mjs";
import tanstackJsPlugins from "../../../config/oxlint/tanstack/js-plugins/index.mjs";

export default {
  extends: [core, jsPlugins, nextJsPlugins, tanstackJsPlugins],
};
