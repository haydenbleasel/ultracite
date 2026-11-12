// A four-way chain (three conditionals deep).
export const grade = (score: number): string =>
  score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "F";
