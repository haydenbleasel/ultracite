---
"ultracite": patch
---

The ESLint `vue`, `svelte` and `astro` presets now parse their files. They registered only the plugin and its rules, never a parser, so ESLint read every `.vue`, `.svelte` and `.astro` file with espree and reported a parse error (`Unexpected token <`) instead of linting it.

Each preset now starts from its plugin's own base config (`flat/base` in `eslint-plugin-vue`, `eslint-plugin-svelte` and `eslint-plugin-astro`), which registers `vue-eslint-parser`, `svelte-eslint-parser` or `astro-eslint-parser` from the plugin's dependencies, and parses `<script lang="ts">` blocks with `@typescript-eslint/parser`. The Svelte preset also covers `.svelte.js` and `.svelte.ts` rune modules. In Astro files, client-side `<script>` tags are linted without type information, because those in-memory virtual files cannot be type-checked.
