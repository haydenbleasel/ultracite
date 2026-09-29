---
"ultracite": patch
---

The Prettier preset now sets `tailwindFunctions` to `clsx`, `cva`, `tw`, `twMerge`, `cn`, `twJoin` and `tv`, so `prettier-plugin-tailwindcss` sorts Tailwind classes passed to those helpers anywhere in a file, for example `const button = cva("p-4 flex")`. Previously only class strings inside `class`/`className` attributes were sorted with Prettier, while the Oxfmt (`sortTailwindcss.functions`) and Biome (`useSortedClasses`) presets already sorted these helpers. See https://github.com/tailwindlabs/prettier-plugin-tailwindcss#sorting-classes-in-function-calls.
