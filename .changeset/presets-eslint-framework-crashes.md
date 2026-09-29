---
"ultracite": patch
---

Fix ESLint presets that crashed the whole run or never reached the files they target.

- **TanStack:** `@tanstack/start/no-async-client-component` and `@tanstack/start/no-client-code-in-server-component` need type information and aborted ESLint ("You have used a rule which requires type information") on the first `.jsx` or `.tsx` file. They now run only on TypeScript files. The Query, Router and Start rules also apply to plain `.ts`/`.js` modules, where query and mutation options are usually declared, instead of only to `.jsx` and `.tsx`. `sort-keys` is off, and `no-use-before-define` and `unicorn/filename-case` are off in `routes/` directories, matching the Oxlint and Biome TanStack presets (alphabetical option keys break TanStack's type inference, and file routes are mutually recursive and encode the URL in the filename).
- **Qwik:** `qwik/valid-lexical-scope` needs type information and crashed ESLint on `.jsx` files. It now runs only on `.tsx` files.
- **Jest:** `jest/no-deprecated-functions` threw "Unable to detect Jest version" and crashed ESLint when the `jest` package was not resolvable from the plugin, for example in bun:test projects. The preset now reads the Jest version from the project and falls back to the latest major.
- **Cypress:** the block used `globals.cypress`, which does not exist in the `globals` package, so `cy`, `Cypress`, `describe` and `it` were reported by `no-undef`. It now uses `eslint-plugin-cypress`'s own globals config. It also matched only `*.cy.js`, and now covers `*.cy.*` for every JS and TS extension plus files under `cypress/`.
- **Storybook:** the block matched only `*.stories.js` and `*.stories.ts`. It now covers `*.stories.*` and `*.story.*` for every JS and TS extension, including `.tsx` and `.jsx`.
