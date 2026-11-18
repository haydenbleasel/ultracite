import { Registry } from "../lib/register.js";
import { Plugin } from "../lib/register.js";

// Two declarations of one module: the first only for a type, the second for values. Converting the
// first to `import type` and merging the second into it in the same pass makes the values type-only.
// (The comment sits below the imports: with a comment above them, another rule's fix claims the range
// first in Ultracite's whole preset and the outcome is right.)
const registry: Registry = { ready: true };
const out = [new Plugin().id, registry];
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
