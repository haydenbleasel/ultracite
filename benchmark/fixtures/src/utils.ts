export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const err = <T>(error: string): Result<T> => ({ ok: false, error });

export const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

export const groupBy = <T, K extends string>(
  items: readonly T[],
  keyOf: (item: T) => K
): Record<K, T[]> => {
  const result = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyOf(item);
    const bucket = result[key] ?? [];
    bucket.push(item);
    result[key] = bucket;
  }
  return result;
};

export const uniqueBy = <T, K>(items: readonly T[], keyOf: (item: T) => K): T[] => {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
};

export const retry = async <T>(
  operation: () => Promise<T>,
  attempts: number
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Operation failed after ${attempts} attempts: ${String(lastError)}`);
};
