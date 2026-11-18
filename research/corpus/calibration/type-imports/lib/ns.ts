// An instantiated namespace (a value and types) and one with only types.
(globalThis.__evaluated ??= []).push("ns");
export namespace NS {
  export const x = 1;
  export type T = string;
}
export namespace Types {
  export interface X {
    a: number;
  }
}
