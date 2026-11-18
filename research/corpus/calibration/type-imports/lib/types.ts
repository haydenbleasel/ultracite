// Types only, plus a side effect so a test can see whether the module evaluated.
(globalThis.__evaluated ??= []).push("types");
export interface Foo {
  a: number;
}
export type Bar = string;
