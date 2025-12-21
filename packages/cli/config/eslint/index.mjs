// Ultracite ESLint Configuration
// Main entry point that exports all configs

import angular from "./angular/index.mjs";
import astro from "./astro/index.mjs";
import core from "./core/index.mjs";
import next from "./next/index.mjs";
import qwik from "./qwik/index.mjs";
import react from "./react/index.mjs";
import remix from "./remix/index.mjs";
import solid from "./solid/index.mjs";
import svelte from "./svelte/index.mjs";
import vue from "./vue/index.mjs";

export default {
  core,
  react,
  next,
  vue,
  svelte,
  solid,
  qwik,
  remix,
  astro,
  angular,
};
