// c16 written so every compiler keeps the side effect and no rule reports: a side-effect import
// plus `import type`.
import "../lib/register.js";
import type { Registry } from "../lib/register.js";

const registry: Registry | undefined = globalThis.__registry;
const out = registry?.ready ?? "not registered";
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
