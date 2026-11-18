// A mix: an inline `type` specifier next to a value.
import { type X, value } from "./y.js";

const a: X = { a: value };
(globalThis.__evaluated ??= []).push("entry");
console.log(JSON.stringify({ a, evaluated: globalThis.__evaluated }));
