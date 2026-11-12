/**
 * Settings for eslint-plugin-jsx-a11y in frameworks that write HTML's
 * attribute names in JSX, shared by the ESLint Solid and Qwik presets.
 */

// React names a label's target `htmlFor`, and it's the only name the label
// rules look for. Solid and Qwik write `for`, and their own plugins report
// `htmlFor` (solid/no-react-specific-props, qwik/no-react-props), so without
// this every `<label for="…">` is reported as having no control.
export const htmlAttributeSettings = {
  "jsx-a11y": {
    attributes: {
      for: ["htmlFor", "for"],
    },
  },
};
