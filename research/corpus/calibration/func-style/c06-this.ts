// C06: a declaration that uses `this` (called with .call), and one with a `this` parameter.
function describe(this: { name: string }): string {
  return `I am ${this.name}`;
}

function legacy() {
  // @ts-expect-error -- untyped this
  return this?.name ?? "none";
}

export const described = describe.call({ name: "a" });
export const legacyName = legacy.call({ name: "b" });
