// Third calibration set: isolating the residual Biome/sonarjs differences seen in hono.
/* eslint-disable */
declare const log: (x: unknown) => void;
declare let a: boolean, b: boolean, c: number;

// E1. else-if nested one level deep. Whitepaper: if +1, inner if +2, inner else-if +1 => 4.
export function e1_nestedElseIf() {
  if (a) {
    if (c === 1) {
      log(1);
    } else if (c === 2) {
      log(2);
    }
  }
}
// E2. else nested one level deep. Whitepaper: if +1, inner if +2, inner else +1 => 4.
export function e2_nestedElse() {
  if (a) {
    if (b) {
      log(1);
    } else {
      log(2);
    }
  }
}
// E3. else-if at the top level followed by else. if +1, else if +1, else +1 => 3.
export function e3_topElseIfElse() {
  if (a) {
    log(1);
  } else if (b) {
    log(2);
  } else {
    log(3);
  }
}
// E4. Outer if/else, where the else block contains an if/else. => 1 + 1 + 2 + 1 = 5.
export function e4_elseContainsIfElse() {
  if (a) {
    log(1);
  } else {
    if (b) {
      log(2);
    } else {
      log(3);
    }
  }
}
// E5. Same as E4 but written as else-if. => 1 + 1 + 1 = 3.
export function e5_elseIfInsteadOfNested() {
  if (a) {
    log(1);
  } else if (b) {
    log(2);
  } else {
    log(3);
  }
}
// E6. Optional parameters do not add anything. => 2.
export function e6_optionalParams(x?: number, y?: string) {
  if (x) log(x);
  if (y) log(y);
}
// E7. Accessors with two ifs each (=> 2 each).
export class E7 {
  get value() {
    if (a) return 1;
    if (b) return 2;
    return 3;
  }
  set value(v: number) {
    if (v > 0) log(v);
    if (v > 1) log(v);
  }
  static create() {
    if (a) return new E7();
    if (b) return null;
    return undefined;
  }
}
export const e7_object = {
  get value() {
    if (a) return 1;
    if (b) return 2;
    return 3;
  },
};
// E8. else-if chain nested two levels deep: 1 + 2 + 3 + 1 + 1 = 8.
export function e8_deepElseIf() {
  if (a) {
    if (b) {
      if (c === 1) {
        log(1);
      } else if (c === 2) {
        log(2);
      } else if (c === 3) {
        log(3);
      }
    }
  }
}
// E9. nested if inside a nested else: if +1, if +2 (in then), else +1, if +3? (in else of nested) => whitepaper 1+2+1+3 = 7
export function e9_ifInNestedElse() {
  if (a) {
    if (b) {
      log(1);
    } else {
      if (c) log(2);
    }
  }
}
