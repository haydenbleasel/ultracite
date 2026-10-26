// Calibration cases for max-params on declarations (length-calibration.cjs): a declared function,
// an overload pair, a declared class's method and constructor, and a function type, all with five
// parameters. Nothing here is run.

// D01: a declared function
export declare function D01(a: number, b: number, c: number, d: number, e: number): void;

// D02: overloads
export declare function D02(a: string): string;
export declare function D02(a: number, b: number, c: number, d: number, e: number): number;

// D03: a declared class
export declare class D03 {
  constructor(a: number, b: number, c: number, d: number, e: number);
  method(a: number, b: number, c: number, d: number, e: number): void;
}

// D04: a function type
export type D04 = (a: number, b: number, c: number, d: number, e: number) => void;
