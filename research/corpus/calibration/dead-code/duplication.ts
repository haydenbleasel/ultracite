// Calibration cases for duplicated code. Each case starts with a `// ID: description` line; every
// diagnostic up to the next header belongs to it. Function bodies differ between cases so that
// sonarjs/no-identical-functions (which compares every function in the file) only pairs functions
// within a case.

declare function log(...args: unknown[]): void;
declare function save(key: string, value: number): void;

// D01: an export nothing imports (a single-file linter can't know)
export function neverImported(): number {
  return 41;
}

// D02: an if/else whose two branches are identical and span several lines
export function d02(flag: boolean, value: number): number {
  if (flag) {
    log("saving", value);
    save("a", value);
  } else {
    log("saving", value);
    save("a", value);
  }
  return value;
}

// D03: an if/else-if chain where two branches are identical one-liners
export function d03(kind: string): number {
  if (kind === "a") {
    return 1;
  } else if (kind === "b") {
    return 2;
  } else if (kind === "c") {
    return 1;
  }
  return 0;
}

// D04: duplicated multi-line branches in a chain with a different final else
export function d04(kind: string, value: number): void {
  if (kind === "a") {
    log("a or c", value);
    save("x", value);
  } else if (kind === "b") {
    log("b", value);
  } else if (kind === "c") {
    log("a or c", value);
    save("x", value);
  } else {
    log("other");
  }
}

// D05: a ternary whose branches are identical
export function d05(flag: boolean, value: number): number {
  return flag ? value * 3 : value * 3;
}

// D06: a switch with two identical multi-line cases
export function d06(kind: string, value: number): void {
  switch (kind) {
    case "a":
      log("case", value);
      save("y", value);
      break;
    case "b":
      log("other case");
      break;
    case "c":
      log("case", value);
      save("y", value);
      break;
    default:
      break;
  }
}

// D07: identical functions whose bodies span 2 lines (one statement and the return)
export function d07a(value: number): number {
  const doubled = value * 2;
  return doubled + 7;
}
export function d07b(value: number): number {
  const doubled = value * 2;
  return doubled + 7;
}

// D08: identical functions whose bodies span 3 lines
export function d08a(value: number): number {
  const tripled = value * 3;
  log(tripled);
  return tripled + 8;
}
export function d08b(value: number): number {
  const tripled = value * 3;
  log(tripled);
  return tripled + 8;
}

// D09: identical functions with 3 statements, written as arrow functions
export const d09a = (value: number): number => {
  const halved = value / 2;
  log("halved", halved);
  return halved + 9;
};
export const d09b = (value: number): number => {
  const halved = value / 2;
  log("halved", halved);
  return halved + 9;
};

// D10: near-duplicate functions: the same body with renamed identifiers (a Type-2 clone)
export function d10a(price: number): number {
  const taxed = price * 1.1;
  log("price", taxed);
  return Math.round(taxed * 100) / 100;
}
export function d10b(amount: number): number {
  const withTax = amount * 1.1;
  log("price", withTax);
  return Math.round(withTax * 100) / 100;
}

// D11: near-duplicate functions that differ in one literal (a Type-2 clone)
export function d11a(value: number): number {
  const scaled = value * 4;
  log("scaled", scaled);
  return scaled - 11;
}
export function d11b(value: number): number {
  const scaled = value * 5;
  log("scaled", scaled);
  return scaled - 11;
}

// D12: identical functions as object-literal methods
export const d12 = {
  first(value: number): number {
    const shifted = value + 12;
    log("shift", shifted);
    return shifted * 2;
  },
  second(value: number): number {
    const shifted = value + 12;
    log("shift", shifted);
    return shifted * 2;
  },
};

// D13: identical callbacks passed inline
export function d13(items: number[], others: number[]): number[] {
  const a = items.map((n) => {
    const squared = n * n;
    log("sq", squared);
    return squared + 13;
  });
  const b = others.map((n) => {
    const squared = n * n;
    log("sq", squared);
    return squared + 13;
  });
  return [...a, ...b];
}

// D14: identical class methods
export class D14 {
  first(value: number): number {
    const offset = value - 14;
    log("offset", offset);
    return offset * offset;
  }
  second(value: number): number {
    const offset = value - 14;
    log("offset", offset);
    return offset * offset;
  }
}

// D15: an identical operand on both sides
export function d15(a: number): boolean {
  return a === a;
}

// END
