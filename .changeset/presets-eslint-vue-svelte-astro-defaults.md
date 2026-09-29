---
"ultracite": patch
---

Fix false positives in the ESLint `vue`, `svelte` and `astro` presets that appeared once their files were actually parsed.

- `vue/block-lang` and `svelte/block-lang` rejected every `<script lang="ts">`, because with no options they only allow blocks without a `lang` attribute. They now allow TypeScript scripts, and `less` and `scss` styles, as well as blocks without `lang`.
- Astro's client-side `<script>` tags are linted as virtual files named `1_1.ts`, `2_1.js` and so on, which `github/filenames-match-regex` reported on every page with a script tag. Filename rules are now off for those virtual files.
- The Astro preset passes `@typescript-eslint/parser` for the frontmatter explicitly. ESLint's config merge dropped the copy in `eslint-plugin-astro`'s base config, so frontmatter TypeScript parsed only when `@typescript-eslint/parser` happened to resolve from the working directory, and failed with `The keyword 'interface' is reserved` otherwise.
- `ultracite init` now installs `eslint-plugin-jsx-a11y` for Astro projects using ESLint. The preset enables `eslint-plugin-astro`'s `astro/jsx-a11y/*` rules, which load that package and reported "you need to install eslint-plugin-jsx-a11y" on every `.astro` file when it was missing.
