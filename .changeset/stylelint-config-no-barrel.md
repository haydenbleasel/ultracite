---
"ultracite": patch
---

The `stylelint.config.mjs` that `ultracite init` writes on the ESLint toolchain now passes `ultracite check`. It was `export { default } from "ultracite/stylelint";`, which the ESLint core preset reports as a barrel file (`unicorn/no-barrel-files`), so a new project failed its first check on a file it never wrote. Init now writes `import config from "ultracite/stylelint";` followed by `export default { ...config };`, and re-running it replaces the old one-line config. A config you changed is left as it is.
