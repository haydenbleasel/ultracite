// An if/else that unicorn/prefer-ternary turns into a ternary.
export const sign = (n: number): string => {
  if (n >= 0) {
    return "positive";
  } else {
    return "negative";
  }
};
export const pick = (flag: boolean): number => {
  let value = 1;
  if (flag) {
    value = 2;
  }
  return value;
};
export const flat = (flag: boolean): string => {
  if (flag) {
    return "yes";
  }
  return "no";
};
