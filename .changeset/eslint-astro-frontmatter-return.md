---
"ultracite": patch
---

The ESLint `astro` preset no longer reports a `return` in a page's frontmatter, such as `return Astro.redirect("/404");`, as `"return" should be used inside a function` (`unicorn/prefer-module`). Astro compiles frontmatter into the page's render function, so the statement is valid. The Oxlint preset has allowed it since #805; the ESLint preset now does the same, and still reports `require`, `module.exports`, `__dirname` and `__filename` in `.astro` files through `import-x/no-commonjs` and `no-restricted-globals`.
