---
"ultracite": patch
---

Update Biome to 2.6.8. Biome 2.6.5 to 2.6.8 add 146 nursery rules, which the Biome presets leave off, and promote, rename or remove none, so the lint rules in the presets are unchanged.

Several rules the presets already turn on report more after upgrading. `useWhile` reports `for (;;)` and fixes it to `while (true)`. `noUselessStringConcat` reports literals joined after another value, such as `foo + "a" + "b"`. `noUnreachableSuper` reports `this` in a constructor parameter's default value. `noVueDuplicateKeys` checks what `setup()` returns, and `noUnresolvedImports`, which `biome/type-aware` turns on, reports a default import from a module that only has `export *`. The type-aware rules now narrow a variable after a `typeof`, equality, nullish or truthiness check and evaluate conditional types, so they report less on code that was already correct.

The `useSortedProperties` assist that core turns on now sorts each run of consecutive declarations on its own and keeps nested rules, at-rules and SCSS variable declarations where they are. The unsafe fix for `noDistractingElements` removes the whole `<marquee>` element instead of only its opening tag, which left code that didn't parse ([biomejs/biome#13107](https://github.com/biomejs/biome/issues/13107)). Linting is faster, by up to 61% on files without suppression comments.

The Markdown formatter is now on in core, so `ultracite fix` formats `.md` files and `ultracite check` reports the ones that aren't formatted. It was off only because earlier 2.6 releases changed the rendered text, rewriting a literal `[ ]` in prose to `[]`, and 2.6.7 fixed the last of that. Expect a one-time reformat on upgrading: it pads tables, normalises emphasis markers and formats the code inside fences. To keep Markdown as it is, set `"markdown": { "formatter": { "enabled": false } }` in your `biome.jsonc`. See the release notes for [2.6.5](https://github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.6.5), [2.6.6](https://github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.6.6), [2.6.7](https://github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.6.7) and [2.6.8](https://github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.6.8).

Requires @biomejs/biome >= 2.6.7
