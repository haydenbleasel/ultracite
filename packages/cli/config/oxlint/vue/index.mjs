import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["vue"],
  rules: {
    "vue/no-deprecated-model-definition": "error",
    "vue/return-in-computed-property": "error",
  },
});
