// Sixth calibration set: `finally`, and a function used directly as a ternary branch.
/* eslint-disable */
declare const log: (x: unknown) => void;
declare let a: boolean, b: boolean;

// H1. try/finally. Whitepaper: if +1, finally +0 => 1 (shown with a second if so Biome reveals it: 2).
export function h1_finally() {
  if (a) log(0);
  if (b) log(0);
  try {
    log(1);
  } finally {
    log(2);
  }
}
// H2. try/catch/finally. catch +1, two ifs +2 => 3 (+1 if finally counts).
export function h2_catchFinally() {
  if (a) log(0);
  if (b) log(0);
  try {
    log(1);
  } catch (error) {
    log(error);
  } finally {
    log(2);
  }
}
// H3. Function as a ternary branch, followed by an if. Whitepaper: ?: +1, if +1 => 2.
export function h3_ternaryFunction() {
  const f = a ? () => 1 : null;
  if (b) log(f);
}
// H4. Both ternary branches are functions, followed by a loop with an if. ?: +1, for +1, if +2 => 4.
export function h4_ternaryTwoFunctions(xs: number[]) {
  const f = a ? () => 1 : () => 2;
  for (const x of xs) {
    if (x) log(f);
  }
}
// H5. Same as H3 but the function is wrapped (not the direct branch). ?: +1, if +1 => 2.
export function h5_ternaryWrapped() {
  const f = a ? (() => 1) as () => number : null;
  if (b) log(f);
}
