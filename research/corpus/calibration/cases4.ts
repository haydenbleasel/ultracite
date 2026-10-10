// Fourth calibration set: `else` handling where Biome scored lower than sonarjs in hono.
/* eslint-disable */
declare const log: (x: unknown) => void;
declare let a: boolean, b: boolean, c: boolean;

// F1. hono's handleParsingAllValues shape. Whitepaper: 1 + 2 + 1 + 1 + 2 + 1 = 8.
export function f1() {
  if (a) {
    if (b) {
      log(1);
    } else {
      log(2);
    }
  } else {
    if (c) {
      log(3);
    } else {
      log(4);
    }
  }
}
// F2. if { if/else } else {}. 1 + 2 + 1 + 1 = 5.
export function f2() {
  if (a) {
    if (b) {
      log(1);
    } else {
      log(2);
    }
  } else {
    log(3);
  }
}
// F3. if { if } else { if }. 1 + 2 + 1 + 2 = 6.
export function f3() {
  if (a) {
    if (b) log(1);
  } else {
    if (c) log(2);
  }
}
// F4. if {} else { if } — the else holds a single if (no braces difference). 1 + 1 + 2 = 4.
export function f4() {
  if (a) {
    log(1);
  } else {
    if (c) log(2);
  }
}
// F5. if {} else { if {} else {} } with a statement before the inner if. 1 + 1 + 2 + 1 = 5.
export function f5() {
  if (a) {
    log(1);
  } else {
    log(0);
    if (c) {
      log(2);
    } else {
      log(3);
    }
  }
}
// F6. Loop containing if/else. 1 + 2 + 1 = 4.
export function f6(xs: number[]) {
  for (const x of xs) {
    if (x) {
      log(1);
    } else {
      log(2);
    }
  }
}
// F7. if { loop { if } } else { loop { if } }. 1 + 2 + 3 + 1 + 2 + 3 = 12.
export function f7(xs: number[]) {
  if (a) {
    for (const x of xs) {
      if (x) log(x);
    }
  } else {
    for (const x of xs) {
      if (x) log(x);
    }
  }
}
// F8. Ternary nested inside an else block. if +1, else +1, ?: +2 = 4.
export function f8() {
  if (a) {
    log(1);
  } else {
    log(b ? 1 : 2);
  }
}
// F9. Switch inside a loop, with an if in a case. for +1, switch +2, if +3 = 6.
export function f9(xs: number[]) {
  for (const x of xs) {
    switch (x) {
      case 1:
        if (a) log(1);
        break;
      default:
        break;
    }
  }
}
// F10. try/catch inside a loop. for +1, if in try +2, catch +2, if in catch +3 = 8.
export function f10(xs: number[]) {
  for (const x of xs) {
    try {
      if (x) log(x);
    } catch (error) {
      if (a) log(error);
    }
  }
}
