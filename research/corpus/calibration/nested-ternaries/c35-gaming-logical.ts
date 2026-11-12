// Gaming: an && / || chain in place of the nested ternary (wrong when a branch value is falsy).
export const tone = (score: number): string =>
  (score > 80 && "good") || (score > 50 && "fair") || "poor";
export const prefix = (n: number, short: boolean): string =>
  (n === 0 && "") || (short && "#") || "No. ";
