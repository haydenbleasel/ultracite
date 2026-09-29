---
"ultracite": patch
---

The ESLint core preset now lints `.jsx`, `.tsx`, `.mts` and `.cts` files. Its main block previously matched only `.js`, `.mjs`, `.cjs`, `.ts`, `.json` and `.html`, so ESLint skipped `.mts` and `.cts` files entirely ("File ignored because no matching configuration was supplied"), and `.jsx` and `.tsx` files received only the framework preset's rules. `.tsx` files were also parsed by espree, so any TypeScript syntax in them was a parse error. Every TypeScript extension now uses `@typescript-eslint/parser` with type information, and the core rules apply to all of them.

Type information now comes from the TypeScript project service (`parserOptions.projectService: true`) instead of a fixed `project: "./tsconfig.json"`. Solution-style tsconfigs (`"files": []` plus `references`, as in the Vite templates) and monorepo packages now resolve their own tsconfig, where previously every file failed to parse. A file that no tsconfig includes still has to be added to one; typescript-eslint reports it as "not found by the project service" (see https://typescript-eslint.io/troubleshooting/typed-linting/#i-get-errors-telling-me-was-not-found-by-the-project-service-consider-either-including-it-in-the-tsconfigjson-or-including-it-in-allowdefaultproject).

The JavaScript block no longer matches `**/*.json`. espree cannot parse JSON, so every `package.json` and `tsconfig.json` failed with `Parsing error: Unexpected token :`. The ESLint preset does not lint JSON, matching the Oxlint preset.
