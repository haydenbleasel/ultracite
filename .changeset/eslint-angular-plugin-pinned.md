---
"ultracite": patch
---

`init --frameworks angular` with ESLint now installs the `@angular-eslint/eslint-plugin` version the Angular preset is tested against, instead of the latest release, which could add or rename rules the preset didn't know about.
