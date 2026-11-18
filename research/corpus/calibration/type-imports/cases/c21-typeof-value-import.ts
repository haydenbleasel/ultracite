// A value import used only through typeof: a type-only use.
import { config } from "../lib/config.js";

type Config = typeof config;
const out: Config = { a: 2 };
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
