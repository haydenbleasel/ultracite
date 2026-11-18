// A const enum used as a value (inlined by a full program, not by a per-file compiler).
import { Dir } from "../lib/enums.js";

const out = Dir.Up;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
