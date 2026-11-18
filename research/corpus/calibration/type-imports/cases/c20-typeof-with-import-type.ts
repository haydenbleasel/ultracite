// `import type` of a value whose type is read with typeof: valid, nothing to report.
import type { config } from "../lib/config.js";

type Config = typeof config;
const out: Config = { a: 2 };
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
