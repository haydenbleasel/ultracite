// A class used in a type annotation and by instanceof: a value use, so nothing reports it.
import { Service } from "../lib/service.js";

const isService = (x: unknown): x is Service => x instanceof Service;
const out = isService({});
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
