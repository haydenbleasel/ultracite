---
"ultracite": patch
---

Re-running `ultracite init` on an ESLint project no longer discards or rewrites parts of an `eslint.config.*` that already uses Ultracite's presets:

- A config that passes the presets to `defineConfig()` without spreading them, as in `defineConfig(core, react, { rules })`, was replaced by a bare `[...core]`, losing its other presets, ignores and rules. Those presets are now read like spread ones.
- A config init can't regenerate (one exported through a variable, loaded with `require`, or with the presets inside an entry's `extends`) was replaced the same way. It is now left unchanged, with a warning to add new presets by hand.
- A preset the config only applied to some files, such as `{ files: ["**/*.test.ts"], extends: [vitest] }`, was also spread at the top level, so it applied to every file. It now stays scoped.
- Presets were reordered to the order of their `import` statements. They now keep the order the config lists them in.
- An `eslint.config.ts` in a package without `"type": "module"` was rewritten as `eslint.config.mjs` with its type annotations still in it, which ESLint could not parse. ESLint loads a TypeScript config whatever the package's module type, so it now stays a `.ts` file.
