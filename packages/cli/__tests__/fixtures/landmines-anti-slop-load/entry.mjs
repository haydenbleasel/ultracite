import antiSlop from "../../../config/oxlint/anti-slop/index.mjs";
import core from "../../../config/oxlint/core/index.mjs";
import landmines from "../../../config/oxlint/landmines/index.mjs";

export default {
  extends: [core, landmines, antiSlop],
};
