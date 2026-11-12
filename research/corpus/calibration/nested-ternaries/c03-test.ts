// Nesting in the test: the condition itself is a ternary.
export const shouldShow = (strict: boolean, a: boolean, b: boolean): string =>
  (strict ? a && b : a || b) ? "show" : "hide";
