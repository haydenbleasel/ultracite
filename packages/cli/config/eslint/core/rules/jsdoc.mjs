// Mirrors the jsdoc section of the oxlint core config
// (config/oxlint/core/index.mjs), which is the benchmark for rule decisions
// across linters. Only the rules oxlint implements are enabled here — the
// rest of eslint-plugin-jsdoc's rules stay off to keep the two presets in
// lockstep.
const config = {
  "jsdoc/check-access": "error",
  "jsdoc/check-property-names": "error",
  "jsdoc/check-tag-names": "error",
  "jsdoc/empty-tags": "error",
  "jsdoc/implements-on-classes": "error",
  "jsdoc/no-defaults": "error",
  "jsdoc/require-param": "off",
  "jsdoc/require-param-description": "error",
  "jsdoc/require-param-name": "error",
  "jsdoc/require-param-type": "off",
  "jsdoc/require-property": "error",
  "jsdoc/require-property-description": "error",
  "jsdoc/require-property-name": "error",
  "jsdoc/require-property-type": "error",
  "jsdoc/require-returns": "off",
  "jsdoc/require-returns-description": "error",
  "jsdoc/require-returns-type": "off",
  "jsdoc/require-throws-description": "error",
  "jsdoc/require-throws-type": "error",
  "jsdoc/require-yields": "error",
  "jsdoc/require-yields-description": "error",
  "jsdoc/require-yields-type": "error",
};

export default config;
