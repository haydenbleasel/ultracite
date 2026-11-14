---
"ultracite": patch
---

`ultracite check` and `ultracite fix` now expand a glob target on Biome and Oxlint setups, such as `ultracite check "src/**/*.ts"` in a `package.json` script, where no shell expands the quoted pattern. Neither linter reads a glob as one. Biome looked for a file with that literal name, checked nothing and exited 0, so the script passed without linting anything; Oxlint exited 1 with "No files found to lint" after the formatter had run. A path that exists is still passed as it is, so `app/[slug]/page.tsx` is unaffected, and ESLint setups are unchanged because ESLint, Prettier and Stylelint expand globs themselves.
