// Calibration cases for the dead-code post: unused names, dead values, unreachable code and the
// ways a name can be "used" just to silence a rule. Each case starts with a `// ID: description`
// line, and every diagnostic up to the next case header belongs to it. Cases are exported
// functions so the function itself is never unused (except where that's the point).
// Run with dead-code-linters.cjs --calibration.

declare function compute(): number;
declare function load(id: string): { id: string; name: string; secret: string };
declare function normalize(input: string): string;
declare function validate(input: string): boolean;
declare function log(...args: unknown[]): void;
declare function acquire(): Disposable;

// ── unused names ───────────────────────────────────────────────────────

// U01: an unused local
export function u01(): number {
  const unused = compute();
  return 1;
}

// U02: an unused local with a `_` prefix
export function u02(): number {
  const _unused = compute();
  return 1;
}

// U03: an unused parameter before a used one
export function u03(first: number, second: number): number {
  return second;
}

// U04: an unused parameter after a used one
export function u04(first: number, second: number): number {
  return first;
}

// U05: `_`-prefixed unused parameters, before and after a used one
export function u05(_first: number, second: number, _third: number): number {
  return second;
}

// U06: object destructuring with a rest sibling (the "omit" idiom)
export function u06(id: string) {
  const { secret, ...publicFields } = load(id);
  return publicFields;
}

// U07: an unused catch binding
export function u07(): number {
  try {
    return compute();
  } catch (error) {
    return 0;
  }
}

// U08: an unused catch binding with a `_` prefix
export function u08(): number {
  try {
    return compute();
  } catch (_error) {
    return 0;
  }
}

// U09: an unused catch binding omitted (optional catch binding)
export function u09(): number {
  try {
    return compute();
  } catch {
    return 0;
  }
}

// U10: an unused private member (TypeScript `private` and an ES `#private` field)
export class U10 {
  private cache = new Map<string, number>();
  #pending = 0;
  value(): number {
    return 1;
  }
}

// U11: a private method that is never called
export class U11 {
  private helper(): number {
    return 2;
  }
  value(): number {
    return 1;
  }
}

// U12: an unused non-exported function at module level
function unusedHelper(): number {
  return compute();
}

// U13: an unused function declared inside a function
export function u13(): number {
  function inner(): number {
    return 2;
  }
  return 1;
}

// U14: an unused type alias and interface
type UnusedAlias = { id: string };
interface UnusedInterface {
  id: string;
}

// U15: a variable whose only "use" is updating itself
export function u15(items: number[]): number {
  let count = 0;
  for (const item of items) {
    count += item;
  }
  return items.length;
}

// U16: array destructuring with an unused first element
export function u16(pair: [string, number]): number {
  const [label, value] = pair;
  return value;
}

// U17: an unused label
export function u17(items: number[]): number {
  let total = 0;
  outer: for (const item of items) {
    total += item;
  }
  return total;
}

// U18: a destructured parameter property that is never used
export function u18({ id, name }: { id: string; name: string }): string {
  return id;
}

// U19: a variable declared and never assigned, then read
export function u19(): string {
  let label: string | undefined;
  return label ?? "none";
}

// U20: a parameter named exactly `_` (the only parameter)
export const u20 = (_: number): number => 1;

// U21: `_` as a placeholder in an array-destructured callback parameter
export const u21 = (pairs: [string, number][]): number[] =>
  pairs.map(([_, value]) => value);

// U22: a `_`-prefixed placeholder in array destructuring
export function u22(pair: [string, number]): number {
  const [_label, value] = pair;
  return value;
}

// U23: `_` as the renamed key next to a rest sibling
export function u23(id: string) {
  const { secret: _, ...publicFields } = load(id);
  return publicFields;
}

// U24: unused parameters of an `override` method (the base signature requires them)
class U24Base {
  compute(base: number, scale: number): number {
    return base * scale;
  }
}
export class U24 extends U24Base {
  override compute(base: number, scale: number): number {
    return 24;
  }
}

// U25: a `using` declaration whose binding is never read (disposal at scope exit is the point)
export function u25(): number {
  using lock = acquire();
  return 25;
}

// U26: the same with a `_` prefix
export function u26(): number {
  using _lock = acquire();
  return 26;
}

// ── dead values ────────────────────────────────────────────────────────

// V01: a write-only variable (assigned after declaration, never read)
export function v01(): number {
  let result: number;
  result = compute();
  return 1;
}

// V02: a dead store: the first value is overwritten before it is read
export function v02(): number {
  let value = compute();
  value = 2;
  return value;
}

// V03: a dead store at the end: the last assignment is never read
export function v03(items: number[]): number {
  let total = 0;
  for (const item of items) {
    total += item;
  }
  log(total);
  total = 0;
  return items.length;
}

// V04: the bug shape: a value is computed and the wrong variable is used
export function v04(input: string): boolean {
  const normalized = normalize(input);
  return validate(input);
}

// V05: the bug shape as a dead store: the computed value is overwritten by the input
export function v05(input: string): boolean {
  let candidate = normalize(input);
  candidate = input;
  return validate(candidate);
}

// V06: a parameter reassigned and never read again
export function v06(limit: number): number {
  limit = 10;
  return compute();
}

// V07: a value written to a collection that is never read
export function v07(items: string[]): number {
  const seen = new Set<string>();
  for (const item of items) {
    seen.add(item);
  }
  return items.length;
}

// V08: the return value of a non-mutating method is discarded
export function v08(input: string, items: number[]): string {
  input.trim();
  items.concat([1]);
  items.map((n) => n * 2);
  return input;
}

// V09: an expression statement with no effect
export function v09(a: number, b: number): number {
  a + b;
  a === b;
  return a;
}

// V10: a short-circuit and a ternary used as statements
export function v10(ready: boolean, run: () => void): void {
  ready && run();
  ready ? run() : undefined;
}

// V11: an increment whose result is thrown away (`return x++`)
export function v11(count: number): number {
  return count++;
}

// ── unreachable code ───────────────────────────────────────────────────

// R01: code after return
export function r01(): number {
  return 1;
  log("never");
}

// R02: code after throw
export function r02(): number {
  throw new Error("always");
  return 2;
}

// R03: code after a loop that never ends
export function r03(): number {
  while (true) {
    log("tick");
  }
  return 3;
}

// R04: a loop body that always exits on the first iteration
export function r04(items: number[]): number | undefined {
  for (const item of items) {
    return item;
  }
  return undefined;
}

// R05: an else branch that can never run (a duplicate condition)
export function r05(kind: string): number {
  if (kind === "a") {
    return 1;
  } else if (kind === "a") {
    return 2;
  }
  return 0;
}

// R06: a constant condition
export function r06(): number {
  if (false) {
    return 1;
  }
  return 0;
}

// R07: a `return;` at the end of a function, and a `continue;` at the end of a loop
export function r07(items: number[]): void {
  for (const item of items) {
    log(item);
    continue;
  }
  return;
}

// ── silencing: ways to make a rule stop without using the value ────────

// S01: `void x;` to "use" a variable
export function s01(): number {
  const unused = compute();
  void unused;
  return 1;
}

// S02: `x;` as an expression statement to "use" a variable
export function s02(): number {
  const unused = compute();
  unused;
  return 1;
}

// S03: renamed to `_x`
export function s03(): number {
  const _unused = compute();
  return 1;
}

// S04: assigned to `_`
export function s04(): number {
  const _ = compute();
  return 1;
}

// S05: a parameter renamed to `_x`
export function s05(_first: number, second: number): number {
  return second;
}

// S06: exported so it counts as used
export function unusedButExported(): number {
  return compute();
}

// S07: passed to a no-op logger
export function s07(): number {
  const unused = compute();
  log(unused);
  return 1;
}

// S08: the bug shape (V04) silenced with `void`
export function s08(input: string): boolean {
  const normalized = normalize(input);
  void normalized;
  return validate(input);
}

// END
