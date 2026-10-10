// Second calibration set. Every case wraps the construct under test in a leading `if` (+1) so
// that Biome (lowest maxAllowedComplexity is 1, so it only reveals scores >= 2) shows whether the
// construct adds anything.
/* eslint-disable */
declare const log: (x: unknown) => void;
declare let a: boolean, b: boolean, c: boolean;
declare let n: number | undefined, m: number | undefined;

// D1. Callback directly in a function body (no enclosing control flow).
export function d1_callbackInBody(xs: number[]) {
  xs.forEach((x) => {
    if (x) log(x); // sonarjs: +1 in the arrow. Biome: +1 or +2 (does the function boundary nest?)
    if (x > 1) log(x); // second if so Biome reveals the arrow's score
  });
}
// D2. `??` inside a condition.
export function d2_nullish() {
  if (n ?? m) log(1); // if +1, ?? +?
}
// D3. && inside a condition.
export function d3_and() {
  if (a && b) log(1); // if +1, && +1
}
// D4. || inside a condition.
export function d4_or() {
  if (a || b || c) log(1); // if +1, || +1 (whitepaper)
}
// D5. Mixed sequence.
export function d5_mixed() {
  if ((a && b) || c) log(1); // if +1, && +1, || +1 (whitepaper) => 3
}
// D6. Recursion.
export function d6_recursion(k: number): number {
  if (k > 0) return d6_recursion(k - 1); // if +1, recursion +1 (whitepaper)
  return 0;
}
// D7. else containing a nested if.
export function d7_elseNested() {
  if (a) {
    log(1);
  } else {
    if (b) log(2); // if +1, else +1, nested if +2 => 4
  }
}
// D8. Object method returned from a function.
export function d8_factory() {
  return {
    method() {
      if (a) log(1);
      if (b) log(2); // 2 if the object method starts at nesting 0, 4 if nested once
    },
  };
}
// D9. Logical assignment operators.
export function d9_logicalAssign() {
  let x: number | undefined;
  if (a) log(1); // +1
  x ||= 1;
  x &&= 2;
  x ??= 3;
  return x;
}
// D10. JSX && inside a component with an if.
export function D10Component({ show }: { show: boolean }) {
  if (a) log(1); // +1
  return <div>{show && <span />}</div>; // sonarjs: exempt; Biome: +1?
}
// D11. Unlabeled break/continue are free.
export function d11_breaks(xs: number[]) {
  for (const x of xs) { // +1
    if (x === 0) continue; // +2
    if (x < 0) break; // +2
  }
}
// D12. Two nested callbacks in a function body: does nesting accumulate per function level?
export function d12_twoLevels(xs: number[][]) {
  xs.forEach((row) => {
    row.forEach((x) => {
      if (x) log(x);
      if (x > 1) log(x);
    });
  });
}
// D13. Arrow function with expression body ternary inside a callback.
export function d13_mapTernary(xs: number[]) {
  if (a) log(1); // +1
  return xs.map((x) => (x > 0 ? (x > 10 ? "big" : "small") : "neg"));
}
// D14. Negated groups: `!(a && b)` - whitepaper counts the && once.
export function d14_negation() {
  if (!(a && b) && c) log(1); // if +1; && (inner) +1; && outer: separate sequence? sonarjs flattens only direct LogicalExpression children
}
// D15. Nested function declared at top of function body (not a callback).
export function d15_innerDecl() {
  function helper(v: number) {
    if (v) log(v);
    if (v > 1) log(v);
  }
  helper(1);
}
