// C15: inside a function body, a declaration called above where it's written (hoisted, works),
// and a const arrow called above where it's written (TDZ when the function runs).
export const withDeclaration = (n: number): number => {
  return helper(n);
  function helper(x: number): number {
    return x + 1;
  }
};

export const withConst = (n: number): number => {
  if (n < 0) {
    return late(n);
  }
  const late = (x: number): number => x - 1;
  return late(n);
};
