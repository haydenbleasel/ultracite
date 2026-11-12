// TypeScript conditional types use the same syntax; no ternary rule looks at them.
export type TypeName<T> = T extends string
  ? "string"
  : T extends number
    ? "number"
    : T extends boolean
      ? "boolean"
      : "object";
export type Inner<T> = T extends Array<infer U> ? (U extends string ? "strings" : "array") : "other";
export const typeName = (v: unknown): TypeName<unknown> => (typeof v === "string" ? "string" : "object") as TypeName<unknown>;
