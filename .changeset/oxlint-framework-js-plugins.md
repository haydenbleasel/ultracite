---
"ultracite": minor
---

Scope React Doctor's framework-specific rules to per-framework add-on presets (#752)

The `ultracite/oxlint/js-plugins` preset no longer enables React Doctor's `nextjs-*` and TanStack (`query-*`, `tanstack-start-*`) rules for every consumer. Rules like `nextjs-no-img-element` and `tanstack-start-no-anchor-element` fire on plain `<img>`/`<a>` JSX and recommend framework replacements, which falsely errored in Vite + React and other non-Next/non-TanStack projects.

Those rules now live in two new add-on presets:

- `ultracite/oxlint/next/js-plugins`
- `ultracite/oxlint/tanstack/js-plugins`

`ultracite init` wires the matching add-on automatically when you select the framework together with `oxlint-plugin-react-doctor`. If you manage `oxlint.config.ts` by hand and use Next.js or TanStack, add the matching add-on preset to `extends` alongside `js-plugins` to keep those rules — or re-run `npx ultracite init`.

Also fixes re-running `init` on a config that already extends `js-plugins` producing a duplicate `import jsPlugins` declaration.
