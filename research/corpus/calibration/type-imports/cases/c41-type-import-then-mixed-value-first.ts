// tRPC's shape: an `import type` followed by a value import with an inline `type` after the value.
import type { RegistryOptions } from "../lib/register.js";
import { Plugin, type Registry } from "../lib/register.js";

const options: RegistryOptions = { strict: true };
const registry: Registry = { ready: false };
const out = [new Plugin().id, options, registry];
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
