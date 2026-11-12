import plugin from "@angular-eslint/eslint-plugin-template";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`@angular-eslint/template/${key}`, "error"])
);

const overrideRules = {
  // Counts every `@if`, `@for` and `@case` in a template, and past the limit
  // reports each further one. The default limit of 5 fails a form with six
  // validation messages; 20 is what core's `complexity` allows a function.
  "@angular-eslint/template/cyclomatic-complexity": [
    "error",
    { maxComplexity: 20 },
  ],
  // Off because it only applies to apps translated with Angular's own i18n
  // (`@angular/localize`). It wants an `i18n` attribute, with a custom ID, on
  // every element with text and beside every attribute it doesn't know, such
  // as `rel`, `data-testid` or an SVG path's `d`, and its fix adds them.
  "@angular-eslint/template/i18n": "off",
  // Off on purpose: autofocus is a deliberate UX choice (a waitlist or search
  // field that's ready to type into), and the rule can't tell that from a
  // harmful use.
  "@angular-eslint/template/no-autofocus": "off",
  // Off because it reports every signal read (`count()`), which is how a
  // template reads a signal. The rule can't tell one from a method call
  // without type information.
  "@angular-eslint/template/no-call-expression": "off",
  // `class="card" [class]="state()"` isn't a duplicate: Angular merges a
  // static `class` or `style` with a binding to the same attribute.
  "@angular-eslint/template/no-duplicate-attributes": [
    "error",
    { allowStylePrecedenceDuplicates: true },
  ],
  // A computed value (`[style.width.%]="progress()"`) can't be a class. Static
  // `style` attributes and bindings to a constant are still reported.
  "@angular-eslint/template/no-inline-styles": [
    "error",
    { allowBindToStyle: "dynamic", allowNgStyle: "dynamic" },
  ],
};

const config = Object.assign(baseRules, overrideRules);

export default config;
