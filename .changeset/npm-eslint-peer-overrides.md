---
"ultracite": patch
---

`ultracite init --linter eslint` works with npm for React, Next.js, Astro and TanStack projects. `eslint-plugin-react`, `eslint-plugin-jsx-a11y` and `@tanstack/eslint-plugin-start` run on ESLint 10 but their `eslint` peer ranges stop at 9, so npm refused to install them next to it with `ERESOLVE unable to resolve dependency tree`. In npm projects, `init` and `upgrade` now add an [`overrides`](https://docs.npmjs.com/cli/configuring-npm/package-json#overrides) entry to `package.json` for each of those plugins that points its `eslint` peer at your own ESLint (`"eslint": "$eslint"`), so later `npm install` and `npm ci` runs work too. Overrides you already have for those packages are kept. pnpm, Yarn and Bun only warn about peer ranges, so their projects are left as they are.
