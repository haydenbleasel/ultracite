---
"ultracite": patch
---

Enable Tailwind CSS class sorting (`sortTailwindcss`) in the Oxfmt preset. Classes in `class`/`className` attributes and in `clsx`, `cva`, `tw`, `twMerge`, `cn`, `twJoin`, and `tv` calls are now sorted using the same algorithm as `prettier-plugin-tailwindcss`, matching the behavior of the Prettier preset (which always loads the Tailwind plugin) and the Biome preset's `useSortedClasses` rule. Projects without Tailwind installed are unaffected beyond class strings being sorted against the default theme, and oxfmt versions older than 0.35.0 ignore the option.
