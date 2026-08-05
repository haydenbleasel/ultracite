---
"ultracite": patch
---

Fix switching linters removing `storybook` from the project's dependencies. It was swept into the removal set as a peer of `eslint-plugin-storybook`, but it's a user-facing tool a project may use independently of linting.
