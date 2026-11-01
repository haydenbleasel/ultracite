---
"ultracite": patch
---

Update oxfmt to 0.75.0. The release changes no options. It fixes a run of formatting bugs, among them parentheses dropped around private `in` checks and instantiation expressions, a `;` dropped before class members named `in` or `instanceof`, and its width heuristics now measure display width, so lines with wide characters (such as CJK text) can wrap differently after upgrading. Its `prettier-plugin-astro` integration now needs `@astrojs/compiler-rs` 0.5, which is the version `ultracite init` installs. See the [0.75.0 release notes](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.75.0) for the full list.
