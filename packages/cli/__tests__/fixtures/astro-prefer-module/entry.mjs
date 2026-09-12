import astro from "../../../config/oxlint/astro/index.mjs";
import core from "../../../config/oxlint/core/index.mjs";

export default {
  extends: [core, astro],
};
