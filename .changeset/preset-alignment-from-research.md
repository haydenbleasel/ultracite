---
"ultracite": minor
---

Bring the three linters' presets in line with each other on the rules the [research posts](https://www.ultracite.ai/research) measured. Oxlint is the benchmark, so most changes move ESLint and Biome to what Oxlint already did.

**Stricter. These can report new problems when you upgrade.**

- Biome: `noExplicitAny` now applies to test files too, as `no-explicit-any` does in Oxlint and ESLint.
- Biome: `noImportCycles` moves from the `type-aware` preset into core, where Oxlint and ESLint already check import cycles. It adds no measurable time, because core skips `node_modules` ([#843](https://github.com/haydenbleasel/ultracite/issues/843)).
- Biome: `noExcessiveClassesPerFile` is on, matching `max-classes-per-file` in Oxlint and ESLint.
- ESLint: the `react` preset now applies to every JavaScript and TypeScript file, not only `.jsx` and `.tsx`, so custom hooks in `.ts` files get the `react-hooks` rules and JSX in `.js` files gets the accessibility rules. Oxlint and Biome already checked both. Linting a non-React TypeScript project with the `react` preset loaded took about 30% longer in our measurement.
- Oxlint: the `js-plugins`, `next/js-plugins` and `tanstack/js-plugins` presets gain the 267 React Doctor rules the ESLint presets already ran, so both linters now run the same list. Most are for one library (React Router, three.js, Ink, Motion, Remotion) and stay silent in projects that don't use it. The JS plugin pass took about 1.6 times as long on our test project.
- ESLint and Oxlint `js-plugins`: `sonarjs/shorthand-property-grouping` is on. It was off only because it conflicted with `sort-keys`, which is now off by default.
- Oxlint and ESLint: `no-warning-comments` also reports JSDoc's `@todo` tag and a marker behind the asterisks of a block comment (`/** @todo */`, `/* ** TODO */`).

**Looser, or off.**

- `no-unused-vars` follows one convention in all three linters: a leading underscore marks a parameter, variable, caught error or destructured array element as unused on purpose, and a property left out with a rest sibling (`const { secret, ...rest } = obj`) and a `using` declaration aren't reported. ESLint used to report all of these, and Oxlint reported a bare `_` and every unused `catch` binding. This also stops `ultracite fix --unsafe` on Oxlint from deleting the omitted property, which put it back into `rest`. `sonarjs/no-unused-vars` is off in ESLint and Oxlint `js-plugins`: it duplicates the rule and has no option for the convention.
- `no-use-before-define` sets `variables: false` in Oxlint and ESLint: a function that mentions a variable declared further down in an outer scope is no longer reported, since the body runs later. Functions that call each other had no order that passed. A use in the same scope, such as a call at load time above the definition, still reports. The TanStack presets now keep the rule on in route files instead of turning it off, so a route that reads its component before the component is declared is reported.
- `react/function-component-definition` is off in Oxlint and ESLint. Its fix turned a hoisted `function` component into a `const` that could be read before it was defined, and its fix for an unnamed component produced code the rule reported again. `func-style` still asks for function expressions, and leaves `export default function Page()` alone.
- Namespace imports are allowed everywhere: `sonarjs/no-wildcard-import` is off in ESLint and Oxlint `js-plugins`, and `noNamespaceImport` is off in Biome, matching `import/no-namespace` in Oxlint core. Libraries such as Zod and Radix document `import * as` as their API.
- Barrel files: Biome's `noBarrelFile`, ESLint's `unicorn/no-barrel-files` and React Doctor's `no-barrel-import` are off. The first two report a package's entry point, and React Doctor made its rule opt-in. Oxlint's `oxc/no-barrel-file`, which reports only very large barrels, stays on.
- Biome: `noVoid` is off, so `void promise;` can mark a promise that's deliberately not awaited, as Oxlint and ESLint allow.
- Oxlint: `unicorn/prefer-export-from` is off until its fix is corrected ([oxc-project/oxc#29318](https://github.com/oxc-project/oxc/issues/29318)). With `--unsafe` it could drop an export when one `export { a, b }` re-exported from two modules. ESLint keeps the rule.
- ESLint: `jsx-a11y/prefer-tag-over-role` is off until [jsx-eslint/eslint-plugin-jsx-a11y#1102](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1102) is fixed. It threw on an object-valued `role` prop, which aborted the whole run.
- ESLint: `unicorn/name-replacements` is off. Its autofix renamed identifiers across a file (`req` to `request`, `env` to `environment`).
- ESLint: these rules, which reported nothing or didn't apply, are off: `import-x/dynamic-import-chunkname` (webpack magic comments), `unicorn/expiring-todo-comments`, `vue/max-lines-per-block`, `vue/max-template-depth` and `svelte/max-lines-per-block`.
- ESLint and Oxlint `js-plugins`: `sonarjs/todo-tag` and `sonarjs/fixme-tag` are off. They reported every TODO a second time, with a message that contradicted `no-warning-comments`.
- ESLint: `jsx-a11y/control-has-associated-label` uses the options the plugin ships in its own configs, so an input its label wraps is no longer reported, and the Astro preset's `label-has-associated-control` takes the same label and control components as the React preset. `astro/jsx-a11y/no-autofocus` is off, as `no-autofocus` already was for React.
- ESLint: five React Doctor rules are dropped: the four `jsx-no-*-as-prop` rules, which the Oxlint React preset turns off as idiomatic React, and `no-ref-callback-cleanup-before-react-19`, which reported valid React 19 code.
