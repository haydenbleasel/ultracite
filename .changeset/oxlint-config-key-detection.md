---
"ultracite": patch
---

`ultracite init` no longer writes a duplicate key into `oxlint.config.ts` when the key it is checking for is quoted or has a comment on the line above. Two cases were affected. With `--type-aware`, a config whose own `options` sat under a comment got a second `options: { typeAware: true }` ahead of it, which the project's `options` then overrode, so type-aware linting stayed off without the usual notice. And when a leftover `.oxlintrc.json` was migrated, a key such as `"rules"` that the TypeScript config already set was added again from the JSON file, where it took precedence. Both now compare the parsed key, so the config's own value is kept.
