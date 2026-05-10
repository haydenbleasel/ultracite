---
"ultracite": patch
---

Clean up `config/eslint/core/rules/typescript.mjs`: remove 22 stale overrides that referenced rules no longer present in `@typescript-eslint/eslint-plugin` v8.

Most were formatting rules moved out to `@stylistic` (`block-spacing`, `brace-style`, `comma-dangle`, `comma-spacing`, `func-call-spacing`, `indent`, `key-spacing`, `keyword-spacing`, `lines-around-comment`, `lines-between-class-members`, `member-delimiter-style`, `no-extra-parens`, `object-curly-spacing`, `padding-line-between-statements`, `quotes`, `semi`, `space-before-blocks`, `space-before-function-paren`, `space-infix-ops`, `type-annotation-spacing`). The remaining two (`no-type-alias`, `sort-type-union-intersection-members`) were removed/deprecated upstream. All were dead no-ops — no behavior change.
