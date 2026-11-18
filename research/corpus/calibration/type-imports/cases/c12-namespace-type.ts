// An instantiated namespace used only for one of its types.
import { NS } from "../lib/ns.js";

const out: NS.T = "x";
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
