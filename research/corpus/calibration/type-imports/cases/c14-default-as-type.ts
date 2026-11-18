// A default import used only as a type.
import Widget from "../lib/widget.js";

let w: Widget | undefined;
const out = w ?? null;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
