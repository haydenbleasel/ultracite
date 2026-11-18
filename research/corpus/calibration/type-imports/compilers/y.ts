// The imported module: a top-level side effect, an interface and a value. Every case imports it.
(globalThis.__evaluated ??= []).push("y");
export interface X {
  a: number;
}
export interface Z {
  b: string;
}
export const value = 1;
