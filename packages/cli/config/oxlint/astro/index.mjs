import { defineConfig } from "oxlint";

export default defineConfig({
  overrides: [
    {
      files: ["**/*.astro"],
      rules: {
        // Astro compiles frontmatter into the page's server-side render
        // function, so a top-level `return` is valid Astro syntax.
        "unicorn/prefer-module": "off",
      },
    },
  ],
  rules: {},
});
