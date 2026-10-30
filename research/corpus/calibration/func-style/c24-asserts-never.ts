// C24: an assertion function and a never-returning function, as declarations; their callers rely
// on the narrowing.
export function assertString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError("not a string");
  }
}

export function fail(message: string): never {
  throw new Error(message);
}

export const upper = (value: unknown): string => {
  assertString(value);
  return value.toUpperCase();
};

export const kind = (n: 1 | 2): string => {
  switch (n) {
    case 1:
      return "one";
    case 2:
      return "two";
    default:
      fail("unreachable");
  }
};
