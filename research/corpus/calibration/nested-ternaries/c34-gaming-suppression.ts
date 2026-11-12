// Gaming: suppression comments for each linter.
export const toneOxlint = (score: number): string =>
  // oxlint-disable-next-line no-nested-ternary
  score > 80 ? "good" : score > 50 ? "fair" : "poor";
export const toneEslint = (score: number): string =>
  // eslint-disable-next-line no-nested-ternary
  score > 80 ? "good" : score > 50 ? "fair" : "poor";
export const toneBiome = (score: number): string =>
  // biome-ignore lint/style/noNestedTernary: the chain is clearer here
  score > 80 ? "good" : score > 50 ? "fair" : "poor";
