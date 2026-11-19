---
"ultracite": patch
---

Update `prettier-plugin-svelte`, which `init` installs for Svelte projects on ESLint, to 4.2.0. It now puts an element's content on its own lines instead of hugging `>` and `</`, because Svelte 5 removes whitespace at the start and end of an element, so `ultracite fix` can reformat `.svelte` files after upgrading. It also keeps an empty `{:catch}` block, respects `singleQuote` in `<svelte:element this={'tag'}>` and no longer drops comments in an opening tag without attributes. See the [changelog](https://github.com/sveltejs/prettier-plugin-svelte/blob/main/CHANGELOG.md#420).

The Prettier preset was checked against Prettier 3.10.1, which changes no option it sets. The `prettier` peer range stays at `^3.5.3`.
