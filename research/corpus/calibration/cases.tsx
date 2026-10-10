// Calibration cases with hand-computed expectations. Comments give the Cognitive Complexity
// whitepaper (G. Ann Campbell, SonarSource, 2017-2023) increments; the analysis compares what
// eslint-plugin-sonarjs and Biome actually report.
/* eslint-disable */
declare const log: (x: unknown) => void;
declare const cond: boolean;

// C1. Callback nested inside control flow. Whitepaper: nested functions add nesting, and their
// increments count toward the enclosing function (outer = 1 + 2 + (3+1 for if inside lambda at
// nesting 3?)). We want to see whether the callback is scored separately.
export function c1_outerWithCallback(items: number[][]) {
  for (const row of items) { // +1
    if (row.length > 0) { // +2 (nesting 1)
      row.forEach((x) => {
        if (x > 0) { // inside callback
          log(x);
        }
      });
    }
  }
}

// C2. Same callback logic without the callback, for comparison: 1 + 2 + 3 = 6.
export function c2_outerInlined(items: number[][]) {
  for (const row of items) { // +1
    if (row.length > 0) { // +2
      for (const x of row) { // +3
        log(x);
      }
    }
  }
}

// C3. Boolean operator sequences. Whitepaper: +1 per sequence of like operators, so
// && && = +1, || || = +1, && then || = +2. `??` is not covered by the 2017 paper.
export function c3_andSequence(a: boolean, b: boolean, c: boolean) {
  return a && b && c; // whitepaper +1
}
export function c3_orSequence(a: boolean, b: boolean, c: boolean) {
  return a || b || c; // whitepaper +1
}
export function c3_mixed(a: boolean, b: boolean, c: boolean, d: boolean) {
  return (a && b) || (c && d); // whitepaper +3 (&&, ||, &&)
}
export function c3_nullish(a?: number, b?: number) {
  return a ?? b; // whitepaper: n/a
}
export function c3_ifWithOr(a: boolean, b: boolean) {
  if (a || b) { // +1 for if, +1 for || (whitepaper)
    return 1;
  }
  return 0;
}

// C4. else-if chain: if +1, each else if +1, else +1 => 4 (no nesting penalty).
export function c4_elseIf(n: number) {
  if (n === 1) {
    return "a";
  } else if (n === 2) {
    return "b";
  } else if (n === 3) {
    return "c";
  } else {
    return "d";
  }
}

// C5. Flat switch: +1 total for the switch (cases are free). Classic cyclomatic: 1 + 4 cases = 5.
export function c5_switch(n: number) {
  switch (n) {
    case 1:
      return "a";
    case 2:
      return "b";
    case 3:
      return "c";
    case 4:
      return "d";
    default:
      return "e";
  }
}

// C6. Nested ternaries: a? +1, b? +2 (nested), c? +2 (nested in alternate) => 5.
export function c6_ternaries(a: boolean, b: boolean, c: boolean) {
  return a ? (b ? 1 : 2) : c ? 3 : 4;
}

// C7. try/catch: try is free; if inside try +1 (nesting 0 — try does not nest);
// catch +1; if inside catch +2 => 4.
export function c7_tryCatch() {
  try {
    if (cond) log(1);
  } catch (error) {
    if (cond) log(error);
  }
}

// C8. Recursion: whitepaper +1 for each recursive call. Ternary +1. => 2 per whitepaper.
export function c8_recursion(n: number): number {
  return n <= 1 ? 1 : n * c8_recursion(n - 1);
}

// C9. Things only cyclomatic counts: default params, optional chaining, ?? => cognitive 0.
export function c9_defaultsAndOptional(a = 1, { b = 2 } = {}, o?: { p?: { q?: number } }) {
  return o?.p?.q ?? a + b;
}

// C10. Labeled break/continue: loop +1, inner loop +2, if +3, labeled continue +1 => 7.
export function c10_labels(m: number[][]) {
  outer: for (const row of m) {
    for (const x of row) {
      if (x < 0) continue outer;
    }
  }
}

// C11. Class members.
export class C11 {
  method(a: boolean) {
    if (a) return 1; // +1
    return 0;
  }
  get getter() {
    return cond ? 1 : 2; // +1
  }
  field = (a: boolean) => {
    if (a) log(a); // +1
  };
  static {
    if (cond) log("static"); // not a function
  }
}

// C12. Three levels of nested functions, each with one if.
export function c12_level1() {
  if (cond) { // +1
    const level2 = () => {
      if (cond) { // in level2
        const level3 = () => {
          if (cond) log(3); // in level3
        };
        level3();
      }
    };
    level2();
  }
}

// C13. JSX short-circuit: sonarjs ignores `cond && <X/>`.
export function C13Component({ show, items }: { show: boolean; items: string[] }) {
  return (
    <div>
      {show && <span>shown</span>}
      {items.length > 0 ? <ul /> : null}
    </div>
  );
}

// C14. A function with no complexity at all.
export function c14_trivial(a: number) {
  return a + 1;
}

// C15. Deep nesting with few branches: 1 + 2 + 3 + 4 + 5 = 15; cyclomatic = 6.
export function c15_deep(a: number[][][][]) {
  for (const b of a) { // +1
    for (const c of b) { // +2
      for (const d of c) { // +3
        for (const e of d) { // +4
          if (e > 0) log(e); // +5
        }
      }
    }
  }
}

// C16. Object literal method and callback passed to a call at the top level of a module.
export const c16_object = {
  handler(a: boolean) {
    return a ? 1 : 2; // +1
  },
};
[1, 2].map((x) => (x > 1 ? x : 0)); // top-level callback +1

// C17. Function expression assigned in a nested if inside a function: does the IIFE / inner
// function get nesting from its parent's control flow? (sonarjs: separate, starts at 0)
export function c17_parent() {
  if (cond) { // +1
    if (cond) { // +2
      (function inner() {
        if (cond) log(1); // inner: whitepaper would be nested (+4)
      })();
    }
  }
}
