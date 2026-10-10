// Fifth calibration set: does Biome lose a nesting level after a nested if/else?
/* eslint-disable */
declare const log: (x: unknown) => void;
declare let a: boolean, b: boolean, c: boolean, d: boolean;

// G1. Sibling if after a nested if/else, same block. Whitepaper 1 + 2 + 1 + 2 = 6.
export function g1() {
  if (a) {
    if (b) {
      log(1);
    } else {
      log(2);
    }
    if (c) log(3);
  }
}
// G2. Same inside a loop. 1 + 2 + 1 + 2 = 6.
export function g2(xs: number[]) {
  for (const x of xs) {
    if (b) {
      log(x);
    } else {
      log(2);
    }
    if (c) log(3);
  }
}
// G3. Same shape but the nested if has no else. 1 + 2 + 2 = 5.
export function g3() {
  if (a) {
    if (b) log(1);
    if (c) log(3);
  }
}
// G4. Deeper: two nested if/else then an if. 1 + 2 + 3 + 1 + 3 = 10.
export function g4() {
  if (a) {
    if (b) {
      if (c) {
        log(1);
      } else {
        log(2);
      }
      if (d) log(3);
    }
  }
}
// G5. A ternary after a nested if/else. 1 + 2 + 1 + 2 (?: nested once) = 6.
export function g5() {
  if (a) {
    if (b) {
      log(1);
    } else {
      log(2);
    }
    log(c ? 1 : 2);
  }
}
// G6. Two sequential nested if/else blocks then an if. 1 + 2 + 1 + 2 + 1 + 2 = 9.
export function g6() {
  if (a) {
    if (b) {
      log(1);
    } else {
      log(2);
    }
    if (c) {
      log(3);
    } else {
      log(4);
    }
    if (d) log(5);
  }
}
