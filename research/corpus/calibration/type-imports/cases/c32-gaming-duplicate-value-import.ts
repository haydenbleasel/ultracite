// Gaming move: `import type` plus a second, value import of the same module under another name.
import type { Service } from "../lib/service.js";
import { Service as ServiceValue } from "../lib/service.js";

let s: Service | undefined;
const out = [s ?? null, typeof ServiceValue];
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
