// C12: const function expressions, named and anonymous, and a let arrow.
export const named = function named(x: number): number {
  return x * 2;
};

export const anonymous = function (x: number): number {
  return x * 3;
};

export let reassignable = (x: number): number => x;
reassignable = (x: number): number => x + 1;
