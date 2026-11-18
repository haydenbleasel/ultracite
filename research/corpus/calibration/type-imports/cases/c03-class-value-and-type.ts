// A class used as a value and as a type.
import { Service } from "../lib/service.js";

const s: Service = new Service();
const out = s.name;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
