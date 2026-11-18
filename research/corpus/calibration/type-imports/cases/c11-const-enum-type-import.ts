// A const enum imported with `import type` and used as a value.
import type { Dir } from "../lib/enums.js";

const out = Dir.Up;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
