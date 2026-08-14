import antiSlop from "../../../config/oxlint/anti-slop/index.mjs";
import core from "../../../config/oxlint/core/index.mjs";

export default {
  extends: [core, antiSlop],
};
