// A TypeScript wrapper between two conditionals.
type Mode = "a" | "b" | "c";
export const mode = (x: number): Mode => (x > 1 ? "a" : (x > 0 ? "b" : "c") as Mode);
export const nonNull = (a: string | null, b: string | null, c: boolean): string =>
  c ? "c" : (a ? a : b)!;
