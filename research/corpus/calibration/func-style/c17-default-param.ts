// C17: a default parameter value that reads a const defined below (evaluated at call time).
export const scaled = (x: number, factor = FACTOR): number => x * factor;

const FACTOR = 10;

export const result = scaled(2);
