// An inline `type` specifier and nothing else: what no-import-type-side-effects and
// prefer-top-level are about.
import { type X } from "./y.js";

const a: X = { a: 1 };
(globalThis.__evaluated ??= []).push("entry");
console.log(JSON.stringify({ a, evaluated: globalThis.__evaluated }));
