import core from "../../../config/oxlint/core/index.mjs";

// Deliberately extends only core: the Astro override must work for projects
// that never selected the astro preset, since oxlint lints `.astro` files
// by default (#805).
export default {
  extends: [core],
};
