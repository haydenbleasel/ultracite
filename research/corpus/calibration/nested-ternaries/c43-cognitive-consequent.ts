// A ternary nested in the consequent and its rewrites: sonarjs charges each `else`, not a ternary's alternate.
export const ternary = (a: boolean, b: boolean): string => (a ? (b ? "x" : "y") : "z");
export const ifElse = (a: boolean, b: boolean): string => {
  let out: string;
  if (a) {
    if (b) {
      out = "x";
    } else {
      out = "y";
    }
  } else {
    out = "z";
  }
  return out;
};
export const earlyReturn = (a: boolean, b: boolean): string => {
  if (a) {
    if (b) {
      return "x";
    }
    return "y";
  }
  return "z";
};
