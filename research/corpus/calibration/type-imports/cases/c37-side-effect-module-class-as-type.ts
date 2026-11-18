// c16 with a class instead of an interface: wherever imports are kept as written
// (verbatimModuleSyntax, Node's type stripping), the import loads register.js and its side effect
// runs; after the fix it doesn't. Where the compiler elides it (by default), it never ran.
import { Plugin } from "../lib/register.js";

let plugin: Plugin | undefined;
const registry = globalThis.__registry;
const out = [plugin ?? null, registry?.ready ?? "not registered"];
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
