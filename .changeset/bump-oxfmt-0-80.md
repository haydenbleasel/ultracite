---
"ultracite": patch
---

Update oxfmt to 0.80.0. The release changes no options, so the preset is unchanged and the `oxfmt` peer range stays at `>=0.71.0 <1`.

It is mostly bug fixes. oxfmt no longer hangs when it runs with a single worker thread, an assigned class breaks a long `extends` or `implements` clause the way any other class does, and CSS, HTML and Markdown each get formatting fixes. If you set your own `sortImports.groups` and wrap groups in an array, the order inside the array now breaks ties between imports from the same source; the preset sets no groups, so its import order is the same. See the [0.80.0 release notes](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.80.0).
