// unicorn/no-nested-ternary's fix adds parentheses; the formatter takes them away again.
export const tone = (score: number): string =>
  score > 80 ? "good" : score > 50 ? "fair" : "poor";
