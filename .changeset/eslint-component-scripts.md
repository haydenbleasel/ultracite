---
"ultracite": major
---

Lint the scripts in Vue, Svelte and Astro components with the ESLint core rules. Core's globs only matched `.js` and `.ts` files, so a `.vue` file got only the Vue rules, a `.svelte` file only the Svelte rules, and an `.astro` file's frontmatter only the Astro rules, while Oxlint already runs its core rules on those scripts. The `vue`, `svelte` and `astro` presets now apply core's rules to their components, including the TypeScript rules, with the type-checked ones off because a script block isn't part of a tsconfig.

- Components now get core's filename rule like any other file, as on Oxlint, so a PascalCase component such as `TaskList.vue` is reported. SvelteKit route files (`+page.svelte`) are exempt, and Astro and Nuxt pages (`[slug].astro`, `[id].vue`) get the same route-aware pattern as other `pages/` files, on ESLint and in Oxlint's JS plugins.
- In Svelte components and rune modules, `prefer-const`, `unicorn/no-top-level-assignment-in-function` and `sonarjs/declarations-in-global-scope` are off: `svelte/prefer-const` replaces the first, and the other two misread `$props()` and `$state` in a component's scope. SvelteKit's `PageProps` and `LayoutProps`, and Astro's `Props`, are allowed by `unicorn/name-replacements`.
