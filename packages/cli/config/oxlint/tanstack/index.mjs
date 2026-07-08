import { defineConfig } from "oxlint";

export default defineConfig({
  overrides: [
    {
      files: ["**/routes/**/*.{tsx,ts}", "**/app/routes/**/*.{tsx,ts}"],
      rules: {
        "unicorn/filename-case": "off",
      },
    },
    {
      files: ["**/routeTree.gen.ts"],
      rules: {
        "unicorn/filename-case": "off",
        "unicorn/no-abusive-eslint-disable": "off",
      },
    },
  ],
});
