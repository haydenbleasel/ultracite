// Object keys are strings: a lookup matches "1" where === 1 doesn't.
export const calls: string[] = [];
export const inputs: unknown[] = [1, 2, 3, "1", "2", 1.0, -0, true];
export const original = (n: unknown): string =>
  n === 1 ? "one" : n === 2 ? "two" : "many";
export const rewrites = {
  lookup: (n: unknown): string =>
    ({ 1: "one", 2: "two" })[n as 1 | 2] ?? "many",
  map: (n: unknown): string =>
    new Map<unknown, string>([
      [1, "one"],
      [2, "two"],
    ]).get(n) ?? "many",
};
