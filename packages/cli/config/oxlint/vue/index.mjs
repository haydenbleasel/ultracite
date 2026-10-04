import { defineConfig } from "oxlint";

// Every non-nursery vue rule oxlint implements is listed explicitly
// (mirroring the core config's philosophy), with decisions matching the
// ESLint vue preset.
export default defineConfig({
  plugins: ["vue"],
  rules: {
    "vue/component-definition-name-casing": "error",
    "vue/define-emits-declaration": "error",
    "vue/define-props-declaration": "error",
    "vue/define-props-destructuring": "error",
    // Defaults to a single prop per component, which no real component
    // library meets; the core presets leave max-params off for the same
    // reason.
    "vue/max-props": "off",
    "vue/next-tick-style": "error",
    "vue/no-arrow-functions-in-watch": "error",
    "vue/no-async-in-computed-properties": "error",
    "vue/no-computed-properties-in-data": "error",
    "vue/no-deprecated-data-object-declaration": "error",
    "vue/no-deprecated-delete-set": "error",
    "vue/no-deprecated-destroyed-lifecycle": "error",
    "vue/no-deprecated-events-api": "error",
    "vue/no-deprecated-model-definition": "error",
    "vue/no-deprecated-props-default-this": "error",
    "vue/no-deprecated-vue-config-keycodes": "error",
    "vue/no-dupe-keys": "error",
    "vue/no-export-in-script-setup": "error",
    "vue/no-expose-after-await": "error",
    "vue/no-import-compiler-macros": "error",
    "vue/no-lifecycle-after-await": "error",
    "vue/no-multiple-slot-args": "error",
    "vue/no-required-prop-with-default": "error",
    "vue/no-reserved-component-names": "error",
    "vue/no-reserved-keys": "error",
    "vue/no-reserved-props": "error",
    "vue/no-shared-component-data": "error",
    "vue/no-side-effects-in-computed-properties": "error",
    "vue/no-this-in-before-route-enter": "error",
    "vue/no-watch-after-await": "error",
    "vue/prefer-import-from-vue": "error",
    "vue/prop-name-casing": "error",
    "vue/require-default-export": "error",
    "vue/require-default-prop": "error",
    "vue/require-direct-export": "error",
    "vue/require-prop-type-constructor": "error",
    "vue/require-prop-types": "error",
    "vue/require-render-return": "error",
    "vue/require-slots-as-functions": "error",
    "vue/require-typed-ref": "error",
    "vue/return-in-computed-property": "error",
    "vue/return-in-emits-validator": "error",
    "vue/valid-define-emits": "error",
    "vue/valid-define-options": "error",
    "vue/valid-define-props": "error",
    "vue/valid-next-tick": "error",
  },
});
