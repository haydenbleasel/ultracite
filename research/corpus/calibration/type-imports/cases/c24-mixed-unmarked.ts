// A value and a type in one import, neither marked (consistent-type-imports' "some" case).
import { Plugin, Registry } from "../lib/register.js";

const registry: Registry = { ready: false };
const out = [new Plugin().id, registry];
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
