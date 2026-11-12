// A plain object lookup inherits Object.prototype's keys.
export const calls: string[] = [];
export const inputs = ["a", "b", "z", "constructor", "toString", "__proto__", "hasOwnProperty"];
export const original = (k: string): unknown => (k === "a" ? 1 : k === "b" ? 2 : 0);
export const rewrites = {
  lookup: (k: string): unknown => ({ a: 1, b: 2 } as Record<string, number>)[k] ?? 0,
  lookupHasOwn: (k: string): unknown => {
    const table: Record<string, number> = { a: 1, b: 2 };
    return Object.hasOwn(table, k) ? table[k] : 0;
  },
  lookupNullProto: (k: string): unknown =>
    (Object.assign(Object.create(null), { a: 1, b: 2 }) as Record<string, number>)[k] ?? 0,
};
