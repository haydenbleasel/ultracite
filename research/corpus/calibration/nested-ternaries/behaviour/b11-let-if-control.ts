// Positive control: the let/if and early-return rewrites keep behaviour.
export const calls: string[] = [];
const f = (n: number): string => {
  calls.push(`f(${n})`);
  return `f${n}`;
};
export const inputs = [-1, 0, 1, 2];
export const original = (n: number): string => {
  const out = n < 0 ? "neg" : n === 0 ? f(n) : n === 1 ? "one" : f(n * 2);
  return out;
};
export const rewrites = {
  letIf: (n: number): string => {
    let out: string;
    if (n < 0) {
      out = "neg";
    } else if (n === 0) {
      out = f(n);
    } else if (n === 1) {
      out = "one";
    } else {
      out = f(n * 2);
    }
    return out;
  },
  earlyReturn: (n: number): string => {
    if (n < 0) {
      return "neg";
    }
    if (n === 0) {
      return f(n);
    }
    if (n === 1) {
      return "one";
    }
    return f(n * 2);
  },
};
