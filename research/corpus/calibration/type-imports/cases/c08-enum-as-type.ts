// A regular enum used only as a type.
import { Color } from "../lib/enums.js";

const out: Color = "red" as Color;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
