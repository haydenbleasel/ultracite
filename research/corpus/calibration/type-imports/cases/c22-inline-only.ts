// Every specifier has an inline `type` (no-import-type-side-effects).
import { type Foo, type Bar } from "../lib/types.js";

const foo: Foo = { a: 1 };
const bar: Bar = "b";
const out = [foo, bar];
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
