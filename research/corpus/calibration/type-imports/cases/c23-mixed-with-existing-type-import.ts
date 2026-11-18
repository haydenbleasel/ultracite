// A mixed import next to an existing `import type` from the same module: prefer-top-level's
// split writes a second `import type`, which no-duplicates then reports.
import type { RegistryOptions } from "../lib/register.js";
import { type Registry, Plugin } from "../lib/register.js";

const options: RegistryOptions = { strict: true };
const registry: Registry = { ready: false };
const out = [new Plugin().id, options, registry];
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
