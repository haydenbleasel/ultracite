---
"ultracite": patch
---

Update Biome to 2.6.3. Biome 2.6 renamed `useSortedClasses` to [`useTailwindSortedClasses`](https://biomejs.dev/linter/rules/use-tailwind-sorted-classes/) and moved its `functions` option to the top-level `tailwind.mergeFunctions`, so the 8.0 core preset failed to load with "Found an unknown key `useSortedClasses`". The core preset now uses the new name and sets `tailwind.mergeFunctions` to the same functions as before.

Biome 2.6 also promoted 59 nursery rules to stable groups. The presets turn on the ones that match rules the Oxlint presets enable, or that have no Oxlint counterpart and fit the preset:

- Core: `noLoopFunc`, `noUnnecessaryTemplateExpression`, `useArraySome`, `useRegexpTest`, `useMathMinMax`, `noExcessiveNestedCallbacks` (with a limit of 10, matching `max-nested-callbacks`), `useDomNodeTextContent`, `useDomQuerySelector`, `useImportsFirst`, `useNamedCaptureGroup`, `useUnicodeRegex`, `useVarsOnTop`, `useThisInClassMethods`, `useReduceTypeParameter`, `useIframeSandbox`, `noDuplicateFieldDefinitionNames` for GraphQL, `noDuplicateSelectors` and `useBaseline` for CSS, and `noEmptyObjectKeys` and `noTopLevelLiterals` for JSON.
- React: `noComponentHookFactories`, `noJsxNamespace`, `noJsxLeakedDollar`, `noReactStringRefs` and `useReactAsyncServerFunction`.
- Vue: `noVueImportCompilerMacros`, `noVueRefAsOperand`, `noVueVOnNumberValues`, `useVueValidVFor`, `useScopedStyles`, `useVueConsistentDefinePropsDeclaration` and `useVueNextTickPromise`.
- Astro: `useScopedStyles`, which reports `<style is:global>`.
- Svelte: `noInlineStyles`, matching ESLint's `svelte/no-inline-styles`.
- Qwik: `useQwikLoaderLocation`.
- Jest and Vitest: `noConditionalExpect`, `noIdenticalTestTitle`, `useExpect`, `useTestHooksInOrder`, `useTestHooksOnTop`, and `useConsistentTestIt` set to `test()` at the top level and `it()` inside `describe`, matching `consistent-test-it`'s defaults.

`noInlineStyles` stays off outside Svelte, `noExcessiveSelectorClasses` stays off because it has no default limit, and `noUntrustedLicenses` stays off because it reads `node_modules`, which the preset ignores.

GraphQL files are now sorted. The core preset has always turned on `useSortedSelectionSet`, but Biome only runs assist actions on GraphQL files when `graphql.assist.enabled` is set, so it never ran. The preset now sets it and turns on Biome 2.6's [`useGraphqlSortedDefinitions`](https://biomejs.dev/assist/actions/use-graphql-sorted-definitions/), [`useGraphqlSortedVariables`](https://biomejs.dev/assist/actions/use-graphql-sorted-variables/) and [`useGraphqlSortedArguments`](https://biomejs.dev/assist/actions/use-graphql-sorted-arguments/), whose fixes `ultracite fix` applies. Biome marks the selection-set fix unsafe, because GraphQL returns fields in the order they're selected, so selection sets are reported by `ultracite check` and only sorted by `ultracite fix --unsafe`.

Biome 2.6 formats and lints YAML, SCSS and Markdown. YAML and SCSS files are now formatted like the rest of the project. The core preset turns Biome's Markdown formatter off, because in 2.6.3 it drops the space before some inline code spans and changes the rendered text, so `.md` files are left as they were. It turns on Markdown frontmatter parsing, so the linter reads a leading `---` block as frontmatter rather than a heading.

Requires @biomejs/biome >= 2.6.2
