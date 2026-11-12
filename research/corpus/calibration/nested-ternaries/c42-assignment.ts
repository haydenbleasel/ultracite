// A nested ternary assigned to an existing variable.
export const clamp = (value: number, min: number, max: number): number => {
  let out = value;
  out = value < min ? min : value > max ? max : value;
  return out;
};
