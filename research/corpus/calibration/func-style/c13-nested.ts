// C13: a declaration nested in a function, used after it's defined.
export const outer = (n: number): number => {
  function square(x: number): number {
    return x * x;
  }
  return square(n);
};
