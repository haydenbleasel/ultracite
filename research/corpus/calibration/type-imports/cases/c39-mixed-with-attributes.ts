// A mixed import with import attributes (Next.js marks Turbopack transitions this way). A split
// that copies the attributes onto `import type` is invalid TypeScript (TS2857).
import { type Registry, Plugin } from "../lib/register.js" with { "turbopack-transition": "server" };

const registry: Registry = { ready: true };
const out = [new Plugin().id, registry];
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
