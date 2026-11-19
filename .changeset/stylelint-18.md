---
"ultracite": patch
---

Move the Stylelint preset to Stylelint 18. `ultracite init` now installs `stylelint` 18, `stylelint-config-standard` 41 and `stylelint-order` 8, and no longer installs `stylelint-config-idiomatic-order`. `stylelint-config-standard` 41 only supports Stylelint 18, so the `stylelint` peer range moves from `^17.0.0` to `^18.0.0`. Run `ultracite upgrade` to move a project across: it installs the three packages at these versions, and until then `ultracite doctor` reports Stylelint 17 as too old and Stylelint can stop with `Could not find "stylelint-order"`. `upgrade` leaves `stylelint-config-idiomatic-order` in your `package.json`. Nothing loads it any more, so you can remove it.

The property order is unchanged. `stylelint-config-idiomatic-order` has had no release since 2023 and depends on a `stylelint-order` whose fix Stylelint 18 no longer runs, so the preset now holds the same list of 64 properties itself and loads `stylelint-order` directly, with the same `order/properties-order` options: positioning, then display and the box model, then every other property alphabetically. `ultracite fix` gives the same output on CSS, SCSS and Less as it did on Stylelint 17, apart from three things `stylelint-order` 8 does differently:

- A file with a `stylelint-disable` comment anywhere in it is now sorted. Before, its order was reported and never fixed.
- A logical border shorthand now comes before its longhands, as the physical ones always did: `border-block-style` before `border-block-start-style`, `border-inline-width` before `border-inline-end-width`, and so on.
- A property name with capitals in it, such as `DISPLAY`, is placed where its lowercase form goes.

Rule changes from Stylelint 18 and `stylelint-config-standard` 41:

- [`value-no-invalid`](https://stylelint.io/user-guide/rules/value-no-invalid) is new and on for CSS. It reports a value that can't be parsed and math that adds a number to a length or percentage, such as `calc(1px + 2)`. `declaration-property-value-no-unknown` reported these before, so CSS gets the same errors under a new rule name. It is off for SCSS and Less, whose values aren't CSS until they're compiled, and it accepts Tailwind's `--spacing()`, `--alpha()` and `theme()`.
- [`at-charset-rule-no-invalid`](https://stylelint.io/user-guide/rules/at-charset-rule-no-invalid) is new and on. It reports an `@charset` that isn't at the very start of the file or doesn't put its encoding in double quotes.
- `declaration-property-value-no-unknown` now follows `var()`. With `--accent: red` declared in the file, `top: var(--accent)` is reported, because `red` isn't a value `top` takes. Expect new errors where a custom property is used for a property its value doesn't fit. Stylelint 18's [`referenceFiles`](https://stylelint.io/user-guide/configure#referencefiles) option tells it about custom properties declared in other files.
- `declaration-block-single-line-max-declarations` is gone. Stylelint 18 removed the rule, and Prettier already puts each declaration on its own line.
- `function-no-unknown` no longer reports an unknown function with a vendor prefix, such as `-webkit-unknown()`. In CSS, `declaration-property-value-no-unknown` still reports the value.

Stylelint 18 supports Node.js 22.22.2 and later, 24.15.0 and later, and 26. It leaves out Node.js 25, which Ultracite's own range allows: it runs there, but your package manager warns about the engine when it installs it, and one set to enforce engines refuses. If your own Stylelint config sets `declaration-block-single-line-max-declarations`, passes `propertiesSyntax` or `typesSyntax` to `declaration-property-value-no-unknown`, or names a plugin or config by a path with no file extension, see the [migration guide](https://github.com/stylelint/stylelint/blob/main/docs/migration-guide/to-18.md).

Requires stylelint >= 18.0.0
