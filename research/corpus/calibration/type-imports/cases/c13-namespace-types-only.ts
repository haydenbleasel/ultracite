// A namespace that holds only types (not instantiated), used as a type.
import { Types } from "../lib/ns.js";

const out: Types.X = { a: 1 };
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
