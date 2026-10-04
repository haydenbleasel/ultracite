import { defineConfig } from "oxlint";

export default defineConfig({
  overrides: [
    {
      // TanStack Router's generated route tree, kept for TanStack Start
      // projects that adopted the remix preset before the tanstack one existed
      // (#540). The shared ignore list already skips `**/*.gen.*`, but oxlint
      // does not apply ignorePatterns from extended configs, so this still
      // matters for configs that do not re-declare
      // `ignorePatterns: core.ignorePatterns`.
      files: ["**/routeTree.gen.ts"],
      rules: {
        "unicorn/filename-case": "off",
        "unicorn/no-abusive-eslint-disable": "off",
      },
    },
  ],
  rules: {},
});
