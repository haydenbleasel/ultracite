// Moving the inner ternary into a variable evaluates it even when the outer test short-circuits.
export const calls: string[] = [];
const expensive = (n: number): string => {
  calls.push(`expensive(${n})`);
  return `big ${n}`;
};
export const inputs: [boolean, number][] = [
  [true, 500],
  [false, 500],
  [false, 50],
];
export const original = ([cached, n]: [boolean, number]): string =>
  cached ? "cached" : n < 100 ? "medium" : expensive(n);
export const rewrites = {
  helper: ([cached, n]: [boolean, number]): string => {
    const uncached = (): string => (n < 100 ? "medium" : expensive(n));
    return cached ? "cached" : uncached();
  },
  innerVariable: ([cached, n]: [boolean, number]): string => {
    const uncached = n < 100 ? "medium" : expensive(n);
    return cached ? "cached" : uncached;
  },
};
