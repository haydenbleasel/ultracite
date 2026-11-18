// A mixed import whose value specifier is unused: after the split, the value import is unused too.
import { type Registry, Plugin } from "../lib/register.js";

const registry: Registry = { ready: true };
const out = registry;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
