// Mixing ?? and || with the conditional operator: precedence decides what is nested.
export const label = (name: string | undefined, fallback: string | undefined, anonymous: boolean): string =>
  name ?? (anonymous ? "anonymous" : fallback ? fallback : "unknown");
// `||` binds tighter than `?:`, so this is (name || anonymous) ? … : …, not name || (anonymous ? …).
export const precedence = (name: string, anonymous: boolean): string =>
  name || anonymous ? "named" : "nobody";
export const defaulted = (value: number | null, strict: boolean): number =>
  strict ? value ?? 0 : value === null ? -1 : value;
