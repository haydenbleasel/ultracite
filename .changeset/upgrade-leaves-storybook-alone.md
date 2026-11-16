---
"ultracite": patch
---

`ultracite upgrade` no longer reinstalls `storybook` in an ESLint project that uses Storybook without the `storybook` preset. `storybook` is in the list of packages the preset installs because `eslint-plugin-storybook` needs it as a peer, and `upgrade` reinstalls every listed package the project already has, so a project on an older Storybook major had it moved to the version Ultracite pins. It is now reinstalled only when the config imports `ultracite/eslint/storybook` or the project has `eslint-plugin-storybook`.
