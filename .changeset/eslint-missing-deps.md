---
"ultracite": patch
---

Fix `ultracite init --linter eslint` installing an unusable toolchain. The generated ESLint config imports `eslint-plugin-storybook` unconditionally (which requires the `storybook` peer) and the generated Stylelint config extends `stylelint-config-standard` / `stylelint-config-idiomatic-order` / `stylelint-prettier`, but none of those packages were installed — so a fresh ESLint setup failed to load with "Cannot find package 'storybook'" or "Could not find stylelint-config-standard". These four packages are now installed with the ESLint linter.
