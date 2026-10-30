// C01: a function declaration at module level, defined before it's used.
function add(a: number, b: number): number {
  return a + b;
}

export const total = add(1, 2);
