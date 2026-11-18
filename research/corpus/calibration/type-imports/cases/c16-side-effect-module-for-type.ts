// The file relies on a module's side effect (it registers a global) but uses its bindings only as
// types. Wherever the import is elided (by default, or after the fix), the global is missing.
import { Registry } from "../lib/register.js";

const registry: Registry | undefined = globalThis.__registry;
const out = registry?.ready ?? "not registered";
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
