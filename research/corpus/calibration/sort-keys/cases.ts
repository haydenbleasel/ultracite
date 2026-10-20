// Calibration cases for the key-sorting rules (sort-keys-linters.cjs --calibration).
// Each case is one exported declaration named after its id; sort-keys-linters.cjs reads the
// description from its CASES table, so no comment here can trip or steer a rule except where a
// case is about comments. Nothing here is run; behaviour.ts holds the cases that are.

declare const key: string;
declare const other: string;
declare const rest: Record<string, number>;
declare const base: Record<string, number>;
declare const overrides: Record<string, number>;
declare const y: string;
declare const name: string;
declare const age: number;
declare const id: number;
declare const proto: object;

export const K01 = { a: 1, B: 2, c: 3 };
export const K02 = { a10: 1, a2: 2, a1: 3 };
export const K03 = { b: 1, _a: 2, $c: 3, a: 4 };
export const K04 = { 1: "a", 10: "b", 2: "c" };
export const K05 = { b: 1, 2: 2, a: 3, 1: 4 };
export const K06 = { "b-c": 1, a: 2, "a-b": 3, A: 4 };
export const K07 = { b: 1, [key]: 2, a: 3 };
export const K08 = { b: 1, ["a"]: 2 };
export const K09 = { c: 1, [`x${y}`]: 2, b: 3, a: 4 };
export const K10 = { b: 1, a: 2, ...rest, d: 3, c: 4 };
export const K11 = { ...base, b: 1, a: 2 };
export const K12 = { b: 1, a: 2, ...overrides };
export const K13 = {
  // the record's id
  id: 1,
  // what people call it
  name: "x",
  age: 2,
};
export const K14 = {
  /** The record's id. */
  id: 1,
  /** What people call it. */
  name: "x",
  age: 2,
};
export const K15 = {
  zone: "utc", // always UTC
  locale: "en", // the default locale
};
export const K16 = {
  // Colours
  red: "#f00",
  blue: "#00f",
  // Sizes
  small: 4,
  large: 16,
};
export const K17 = {
  zebra: 1,
  apple: 2,

  mango: 3,
  banana: 4,
};
export const K18 = {
  render() {
    return 1;
  },
  init() {
    return 2;
  },
};
export const K19 = {
  set value(v: number) {
    void v;
  },
  get value() {
    return 1;
  },
  count: 0,
};
export const K20 = { name, age, id };
export const K21 = { __proto__: proto, b: 1, a: 2 };
export const K23 = { outer: { z: 1, a: 2 }, inner: 1 };
export type K24 = { b: string; a: number };
export interface K25 {
  b: string;
  a: number;
}
export const K26 = (o: { a: number; b: number }) => {
  const { b, a } = o;
  return a + b;
};
export const K27 = { b: 1, a: 2 } as const;
export const K28 = { b: 1, a: 2 } satisfies Record<string, number>;
export enum K31 {
  B = 1,
  A = 2,
}
export const K32 = { a: 1 };
export const K33 = { ...base, b: 1 };
export const K34 = { é: 1, z: 2, Z: 3 };
export const K35 = { a: 1, A: 2 };
export const K36 = { "": 1, a: 2, " ": 3 };
export const K37 = { [`b`]: 1, a: 2 };
export const K38 = { /* first */ b: 1, a: 2 };
export const K39 = { b: 1, a: 2 /* last */ };
export const K40 = {
  onSuccess: (value: number) => {
    return value + 1;
  },
  onError: (error: Error) => {
    return error.message;
  },
};
export const K41 = { c: 1,   b: 2,
  a: 3 };
export const K42 = {
  async *stream() {
    yield 1;
  },
  async load() {
    return 1;
  },
};
export const K43 = { "10": 1, "9": 2, "1e3": 3 };
export const K44 = { 0x10: "hex", 2: "two", 1e3: "thousand" };
export const K45 = { b: 1, a: 2, [other]: 3, d: 4, c: 5 };
export const K46 = {
  b: 1, // trailing on b
  // leading on a
  a: 2,
};
export const K47 = { B: 1, _: 2, a: 3, "-": 4, "0": 5 };
export const K48 = { item2: 1, item10: 2, item1: 3, Item3: 4 };
export const K49 = { userId: 1, user_id: 2, userid: 3, UserId: 4 };
