---
"ultracite": patch
---

Give `jsx-a11y/label-has-associated-control` in `ultracite/oxlint/react` the options the ESLint react preset already sets: `<Label>` counts as a label, `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>` and `<Radio>` count as controls, and a control is found up to three levels deep. Oxlint used to miss a `<Label>` with no control, and flagged an `<Input>` inside a `<label>`, or an input nested three deep, as unlabelled. Biome's `noLabelWithoutControl` in `ultracite/biome/core` gets the same label and control components.
