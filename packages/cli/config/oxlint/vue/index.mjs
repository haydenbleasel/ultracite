import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["vue"],
  rules: {
    "vue/component-definition-name-casing": "error",
    "vue/no-computed-properties-in-data": "error",
    "vue/no-deprecated-model-definition": "error",
    "vue/no-deprecated-props-default-this": "error",
    "vue/no-expose-after-await": "error",
    "vue/no-reserved-component-names": "error",
    "vue/no-shared-component-data": "error",
    "vue/no-watch-after-await": "error",
    "vue/require-prop-type-constructor": "error",
    "vue/require-render-return": "error",
    "vue/require-slots-as-functions": "error",
    "vue/return-in-computed-property": "error",
    "vue/return-in-emits-validator": "error",
    "vue/valid-define-options": "error",
    "vue/valid-next-tick": "error",
  },
});
