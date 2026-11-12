// What Oxlint's prefer-logical-operator-over-ternary fix writes for `x ? x : y ? 1 : 2`, against the right rewrite.
export const calls: string[] = [];
export const inputs: [number, boolean][] = [
  [0, false],
  [0, true],
  [5, false],
  [5, true],
];
export const original = ([x, y]: [number, boolean]): number => (x ? x : y ? 1 : 2);
export const rewrites = {
  oxlintFix: ([x, y]: [number, boolean]): number => (x || y ? 1 : 2),
  parenthesized: ([x, y]: [number, boolean]): number => x || (y ? 1 : 2),
};
