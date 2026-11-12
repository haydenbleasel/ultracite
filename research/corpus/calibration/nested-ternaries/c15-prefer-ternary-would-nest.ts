// An if/else whose branch already holds a ternary: converting it would nest one.
export const level = (n: number, strict: boolean): string => {
  if (n > 10) {
    return "high";
  } else {
    return strict ? "low" : "medium";
  }
};
export const level2 = (n: number, strict: boolean): string => {
  if (n > 10) {
    return "high";
  }
  return strict ? "low" : "medium";
};
export const assign = (n: number, strict: boolean): string => {
  let out: string;
  if (n > 10) {
    out = "high";
  } else {
    out = strict ? "low" : "medium";
  }
  return out;
};
