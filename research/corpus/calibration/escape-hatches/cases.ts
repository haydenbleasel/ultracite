// Hand-written edge cases for the escape-hatch rules (not from any repo). Each case is one
// statement on a line starting with its id, so a diagnostic maps to a case by line number.
// Run: node research/corpus/scripts/escape-hatch-linters.cjs --calibration

interface User {
  id: string;
  name?: string;
}
declare const input: string;
declare const maybe: User | undefined;
declare const users: Map<string, User>;
declare const list: User[];
declare function load(): unknown;

// ── any ──────────────────────────────────────────────────────────────
export const A1: any = 1; // A1 annotation
export function A2(...args: any[]): void { void args; } // A2 rest parameter
export type A3 = (...args: any[]) => any; // A3 function type
export function A4<T extends any[]>(xs: T): T { return xs; } // A4 constraint
export function A5<T = any>(x: T): T { return x; } // A5 default
export const A6 = JSON.parse(input); // A6 implicit any (JSON.parse)
export const A7 = (load() as any).name; // A7 as any
export const A8 = <any>load(); // A8 angle-bracket any
export function A9(): void { try { load(); } catch (error: any) { void error.code; } } // A9 catch any
export function A10(): void { try { load(); } catch (error) { void error; } } // A10 catch, no annotation
export type A11 = Record<string, any>; // A11 generic argument
export const A12: unknown = load(); // A12 unknown
export let A13; // A13 implicit any let
export const A14 = (load() as { name: string }).name; // A14 as T from unknown
export const A15 = list as unknown as string[]; // A15 double through unknown
export const A16 = list as any as string[]; // A16 double through any
export const A17 = { id: "1" } as User; // A17 object literal assertion
export const A18 = maybe as User; // A18 narrowing assertion
export const A19 = A1.foo.bar; // A19 member access on any
export const A20: Function = () => 1; // A20 Function type

// ── non-null ─────────────────────────────────────────────────────────
export const N1 = maybe!.id; // N1 member access
export const N2 = users.get("a")!; // N2 Map.get
export const N3 = list[0]!; // N3 indexed access
export const N4 = maybe!!; // N4 double assertion
export const N5 = maybe?.name!; // N5 after optional chain
export let N6!: string; // N6 definite assignment
export class N7 { field!: string; } // N7 definite field
export const N8 = maybe?.id; // N8 optional chain (the help text's suggestion)
export const N9 = users.has("a") ? users.get("a")! : undefined; // N9 checked with has()

// ── comments ─────────────────────────────────────────────────────────
// @ts-ignore
export const C1: number = "one"; // C1 ts-ignore
// @ts-expect-error
export const C2: number = "two"; // C2 ts-expect-error without a reason
// @ts-expect-error: the fixture is deliberately wrong
export const C3: number = "three"; // C3 ts-expect-error with a reason
// @ts-expect-error - ??
export const C4: number = "four"; // C4 ts-expect-error with a token reason
/* @ts-ignore */
export const C5: number = "five"; // C5 ts-ignore in a block comment
// @ts-ignore because the upstream types are wrong
export const C6: number = "six"; // C6 ts-ignore with a reason
