---
"ultracite": patch
---

Update `@shadcn/lint`, the plugin behind `ultracite/oxlint/shadcn`, to 0.2.5. It has the same six rules and options, so the preset is unchanged. The release fixes false positives: a call to a `cva` or `tv` result defined in the same file is followed instead of reported as dynamic, a plain element that is the `render` target of a component that adds no classes is left alone, `data-*` and `aria-*` attributes are no longer read as class lists, and `p-4` stays a spacing when the theme resets `--spacing-*`. It also reads `@import "tailwindcss"` the way Tailwind does, reads tsconfig `paths` from a root `tsconfig.base.json`, and no longer stalls or overflows the stack on very long class tokens, const chains and barrel chains. See the release notes for [0.2.4](https://github.com/shadcn-ui/lint/releases/tag/%40shadcn%2Flint%400.2.4) and [0.2.5](https://github.com/shadcn-ui/lint/releases/tag/%40shadcn%2Flint%400.2.5).
