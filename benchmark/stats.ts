/**
 * Small statistics helpers for the benchmark harness.
 *
 * The regression gate compares two independent samples (base vs head) of
 * wall-clock timings. Timings are noisy and not normally distributed, so we
 * use the nonparametric Mann-Whitney U test rather than a t-test, combined
 * with a median-ratio threshold. A regression must clear BOTH bars: a
 * meaningful effect size (ratio) AND statistical significance (p-value).
 */

export const median = (values: readonly number[]): number => {
  if (values.length === 0) {
    return Number.NaN;
  }
  const sorted = [...values].toSorted((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

export const mean = (values: readonly number[]): number => {
  if (values.length === 0) {
    return Number.NaN;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
};

export const stdev = (values: readonly number[]): number => {
  if (values.length < 2) {
    return 0;
  }
  const average = mean(values);
  const variance =
    values.reduce((total, value) => total + (value - average) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
};

/** Standard normal cumulative distribution function (Abramowitz & Stegun 7.1.26). */
const normalCdf = (value: number): number => {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
};

export interface MannWhitneyResult {
  /** One-sided p-value for the alternative "head sample is larger than base". */
  readonly pValue: number;
  /** U statistic for the base sample. */
  readonly uBase: number;
  /** U statistic for the head sample. */
  readonly uHead: number;
}

/**
 * One-sided Mann-Whitney U test using the normal approximation with a tie
 * correction and continuity correction. The alternative hypothesis is that
 * `head` values tend to be larger (slower) than `base` values.
 */
export const mannWhitneyU = (
  base: readonly number[],
  head: readonly number[]
): MannWhitneyResult => {
  const n1 = base.length;
  const n2 = head.length;
  if (n1 === 0 || n2 === 0) {
    return { pValue: 1, uBase: Number.NaN, uHead: Number.NaN };
  }

  // Rank the pooled sample, assigning average ranks to ties.
  const pooled = [
    ...base.map((value) => ({ group: "base" as const, value })),
    ...head.map((value) => ({ group: "head" as const, value })),
  ].toSorted((left, right) => left.value - right.value);

  const ranks: number[] = Array.from({ length: pooled.length });
  const tieGroupSizes: number[] = [];
  let index = 0;
  while (index < pooled.length) {
    let end = index;
    while (
      end + 1 < pooled.length &&
      pooled[end + 1].value === pooled[index].value
    ) {
      end += 1;
    }
    // ranks are 1-based
    const averageRank = (index + end) / 2 + 1;
    for (let position = index; position <= end; position += 1) {
      ranks[position] = averageRank;
    }
    tieGroupSizes.push(end - index + 1);
    index = end + 1;
  }

  let rankSumHead = 0;
  for (let position = 0; position < pooled.length; position += 1) {
    if (pooled[position].group === "head") {
      rankSumHead += ranks[position];
    }
  }

  const uHead = rankSumHead - (n2 * (n2 + 1)) / 2;
  const uBase = n1 * n2 - uHead;

  const meanU = (n1 * n2) / 2;
  const total = n1 + n2;
  const tieTerm = tieGroupSizes.reduce(
    (sum, size) => sum + (size ** 3 - size),
    0
  );
  const varianceU =
    ((n1 * n2) / 12) * (total + 1 - tieTerm / (total * (total - 1)));

  if (varianceU <= 0) {
    return { pValue: 1, uBase, uHead };
  }

  // Continuity correction toward the mean for the "head is larger" tail.
  const z = (uHead - meanU - 0.5) / Math.sqrt(varianceU);
  const pValue = 1 - normalCdf(z);

  return { pValue, uBase, uHead };
};
