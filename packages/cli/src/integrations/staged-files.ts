// Every file type Biome, Oxlint + Oxfmt or ESLint + Prettier + Stylelint
// lints or formats. The pre-commit integrations hand `ultracite fix` only the
// staged files that match, so a type missing here is never fixed on commit.
export const stagedFileExtensions = [
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "mts",
  "cts",
  "json",
  "jsonc",
  "css",
  "scss",
  "less",
  "vue",
  "svelte",
  "astro",
  "html",
  "md",
  "mdx",
  "yaml",
  "yml",
  "graphql",
  "gql",
];
