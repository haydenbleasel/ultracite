// unicorn/prefer-logical-operator-over-ternary on `x ? x : y ? 1 : 2`: `||` binds tighter than `?:`, so the alternate needs parentheses.
export const pick = (x: number, y: boolean): number => (x ? x : y ? 1 : 2);
export const pickParenthesized = (x: number, y: boolean): number => (x ? x : (y ? 1 : 2));
// An arrow function as the alternate: `x || () => {}` is a syntax error.
export const handler = (onSelect: (() => void) | undefined): (() => void) => (onSelect ? onSelect : () => {});
