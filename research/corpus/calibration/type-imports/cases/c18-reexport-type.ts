// A type re-exported without `type` (TS1205 under isolatedModules), next to a value.
export { Foo } from "../lib/types.js";
export { Service } from "../lib/service.js";

const out = "loaded";
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
