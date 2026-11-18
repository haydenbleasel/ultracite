// A value import of an interface, used only as a type.
import { Foo } from "../lib/types.js";

const out: Foo = { a: 1 };
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
