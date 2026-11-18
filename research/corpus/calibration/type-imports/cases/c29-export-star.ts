// `export *` and `export type *` from a module of types.
export * from "../lib/types.js";
export type * from "../lib/service.js";

const out = "loaded";
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
