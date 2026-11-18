// What c02 becomes after the fix, with an instanceof added later: TypeScript rejects it (TS1361).
import type { Service } from "../lib/service.js";

const isService = (x: unknown): x is Service => x instanceof Service;
const out = isService({});
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
