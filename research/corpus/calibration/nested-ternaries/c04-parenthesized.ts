// The chain with the inner ternary in parentheses (what unicorn/no-nested-ternary's fix writes).
export const tone = (score: number): string =>
  score > 80 ? "good" : (score > 50 ? "fair" : "poor");
