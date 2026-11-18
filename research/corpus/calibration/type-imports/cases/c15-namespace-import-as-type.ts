// A namespace import used only for types.
import * as T from "../lib/types.js";

const out: T.Foo = { a: 1 };
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
