// A regular enum used as a value and a type.
import { Color } from "../lib/enums.js";

const out: Color = Color.Red;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
