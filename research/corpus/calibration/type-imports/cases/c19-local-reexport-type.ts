// A type imported and re-exported from a local export list without `type`.
import { Foo } from "../lib/types.js";

export { Foo };
const out = "loaded";
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
