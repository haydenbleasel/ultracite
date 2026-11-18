// A value import that isn't used at all (consistent-type-imports leaves it; unused-import rules
// remove it).
import { Service } from "../lib/service.js";

const out = "unused";
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
