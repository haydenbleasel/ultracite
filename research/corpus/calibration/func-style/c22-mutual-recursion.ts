// C22: mutual recursion, as declarations and as const arrows.
export function isEven(n: number): boolean {
  return n === 0 ? true : isOdd(n - 1);
}
function isOdd(n: number): boolean {
  return n === 0 ? false : isEven(n - 1);
}

export const even = (n: number): boolean => (n === 0 ? true : odd(n - 1));
const odd = (n: number): boolean => (n === 0 ? false : even(n - 1));
