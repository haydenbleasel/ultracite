// Calibration cases for the length rules (length-calibration.cjs). Each case is one top-level
// declaration named after its id; the runner's CASES table describes it and maps every diagnostic
// to the case whose lines contain it. Nothing here is run.

declare const items: number[];
declare const flag: boolean;
declare function use(...args: unknown[]): void;
declare function dec(...args: unknown[]): any;
declare function on(event: string, cb: (...args: any[]) => void): void;

// L01: five physical lines, three statements
export function L01() {
  const a = 1;
  const b = 2;
  return a + b;
}

// L02: blank lines and comments inside the body
export function L02() {
  const a = 1;

  // a line comment

  /*
   * a block comment
   * over four lines
   */
  const b = 2; // a trailing comment
  /** a one-line JSDoc */
  return a + b;
}

// L03: a function nested inside another (the nested lines count for the outer one in every
// line rule; its statements don't)
export function L03() {
  const a = 1;
  function inner() {
    const x = 1;
    const y = 2;
    const z = 3;
    return x + y + z;
  }
  return a + inner();
}

// L04: closing braces and `} else {` on their own lines
export function L04(x: number) {
  if (x > 1) {
    use(1);
  } else if (x > 0) {
    use(2);
  } else {
    use(3);
  }
  for (const i of items) {
    use(i);
  }
}

// L05: an IIFE with a function expression
export const L05 = (function () {
  const a = 1;
  const b = 2;
  return a + b;
})();

// L06: an IIFE with an arrow
export const L06 = (() => {
  const a = 1;
  const b = 2;
  return a + b;
})();

// L07: an IIFE called with .call(), and one behind a TypeScript cast
export const L07 = [
  function () {
    const a = 1;
    return a;
  }.call(null),
  (<() => number>(() => {
    const a = 1;
    return a;
  }))(),
];

// L08: an arrow with a multi-line expression body
export const L08 = (a: number, b: number) =>
  a +
  b +
  a * b +
  a / b;

// L09: a class with a decorated method, a multi-line signature, a constructor with parameter
// properties, a getter and a setter
export class L09 {
  private v = 0;
  constructor(
    private readonly a: number,
    public b: string,
    protected c: boolean,
    readonly d: number
  ) {
    use(a, b, c, d);
  }
  @dec()
  method(x: number) {
    const y = x;
    return y;
  }
  multi(
    first: number,
    second: number
  ) {
    return first + second;
  }
  get value() {
    const v = this.v;
    return v;
  }
  set value(next: number) {
    const n = next;
    this.v = n;
  }
  static {
    const s = 1;
    use(s);
  }
}

// L10: object methods, getters and setters
export const L10 = {
  method() {
    const a = 1;
    return a;
  },
  get value() {
    const a = 1;
    return a;
  },
  set value(next: number) {
    use(next);
  },
  arrow: () => {
    const a = 1;
    return a;
  },
};

// L11: overloads (bodiless signatures) and the implementation
export function L11(a: string): string;
export function L11(a: number, b: number, c: number, d: number): number;
export function L11(a: unknown, b?: number, c?: number, d?: number): unknown {
  return [a, b, c, d];
}

// L12: default, rest and destructured parameters
export function L12(
  a = 1,
  { b, c }: { b: number; c: number },
  [d, e]: [number, number],
  ...rest: number[]
) {
  return a + b + c + d + e + rest.length;
}

// L13: a typed `this` parameter and three more
export function L13(this: Window, a: number, b: number, c: number) {
  return [this, a, b, c];
}

// L14: a `this: void` parameter and three more
export function L14(this: void, a: number, b: number, c: number) {
  return [a, b, c];
}

// L15: four parameters in a function type, a method signature and a call signature
export interface L15 {
  callback: (a: number, b: number, c: number, d: number) => void;
  method(a: number, b: number, c: number, d: number): void;
  (a: number, b: number, c: number, d: number): void;
  new (a: number, b: number, c: number, d: number): L15;
}

// L16: a function type alias with four parameters
export type L16 = (a: number, b: number, c: number, d: number) => void;

// L17: a switch with statements in its cases (not blocks), one case with a block
export function L17(kind: string) {
  switch (kind) {
    case "a":
      use(1);
      use(2);
      break;
    case "b": {
      use(3);
      use(4);
      break;
    }
    default:
      use(5);
  }
}

// L18: depth: else-if chains don't nest; try, switch and loops do; catch and finally don't add
export function L18(x: number) {
  try {
    if (x) {
      for (const i of items) {
        switch (i) {
          case 1:
            while (flag) {
              use(i);
            }
            break;
        }
      }
    } else if (x > 1) {
      use(x);
    } else if (x > 2) {
      if (flag) {
        use(x);
      }
    }
  } catch {
    if (flag) {
      use(0);
    }
  } finally {
    use(1);
  }
}

// L19: depth: an `if` that is the consequent of another `if` without braces
export function L19(a: boolean, b: boolean) {
  if (a)
    if (b) {
      use(1);
    }
}

// L20: depth: a bare block and a labelled loop
export function L20() {
  {
    {
      use(1);
    }
  }
  outer: for (const i of items) {
    if (i) {
      continue outer;
    }
  }
}

// L21: nesting across functions: S134 carries the outer nesting into a callback; max-depth resets
export function L21() {
  for (const i of items) {
    if (i) {
      items.forEach((j) => {
        if (j) {
          while (flag) {
            use(j);
          }
        }
      });
    }
  }
}

// L22: callbacks: plain, through `new`, behind a cast, parenthesised, and an IIFE in a callback
export function L22() {
  on("a", () => {
    on("b", function () {
      new Promise((resolve) => {
        on("c", (() => {
          return () => resolve(1);
        })());
        on("d", ((x: number) => use(x)) as any);
      });
    });
  });
}

// L23: callbacks nested six deep
export function L23() {
  on("1", () => {
    on("2", () => {
      on("3", () => {
        on("4", () => {
          on("5", () => {
            on("6", () => {
              use(6);
            });
          });
        });
      });
    });
  });
}

// L24: statements: a directive, nested blocks, and an arrow with an expression body inside
export function L24() {
  "use strict";
  const a = 1;
  if (a) {
    use(a);
    use(a);
  }
  const f = () => use(a);
  return f;
}

// L25: a long object literal (data)
export function L25() {
  return {
    alpha: 1,
    beta: 2,
    gamma: 3,
    delta: 4,
    epsilon: 5,
    zeta: 6,
    eta: 7,
    theta: 8,
  };
}

// L26: a long template literal
export function L26(name: string) {
  return `
    Hello ${name},
    line two
    line three
    line four
  `;
}

// L27: union types: in a type alias (S4622 skips it), in a parameter, in a utility type
export type L27 = "a" | "b" | "c" | "d";
export function L27f(x: "a" | "b" | "c" | "d", y: Exclude<"a" | "b" | "c" | "d", "a">) {
  return [x, y];
}

// L28: a setter and a getter with parameters (max-params)
export class L28 {
  set value(v: number) {
    use(v);
  }
}

// L29: a constructor with five plain parameters
export class L29 {
  constructor(a: number, b: number, c: number, d: number, e: number) {
    use(a, b, c, d, e);
  }
}

// L30: an async generator method and an abstract method
export abstract class L30 {
  async *gen() {
    yield 1;
  }
  abstract run(a: number, b: number, c: number, d: number): void;
}

// L31: a function made of one long call (one statement over many lines)
export function L31() {
  use(
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8
  );
}
