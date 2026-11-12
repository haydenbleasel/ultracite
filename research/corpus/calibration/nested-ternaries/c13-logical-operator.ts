// A ternary that unicorn/prefer-logical-operator-over-ternary rewrites.
export const title = (custom: string | undefined, fallback: string): string =>
  custom ? custom : fallback;
export const nested = (a: string | undefined, b: string | undefined): string =>
  a ? a : b ? b : "none";
