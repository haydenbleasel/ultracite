// A class imported without `type` and used only in a type annotation.
import { Service } from "../lib/service.js";

let s: Service | undefined;
const out = s ?? null;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
