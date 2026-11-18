// Two inline `type` specifiers, nothing else.
import { type X, type Z } from "./y.js";

const a: X = { a: 1 };
const b: Z = { b: "b" };
(globalThis.__evaluated ??= []).push("entry");
console.log(JSON.stringify({ a, b, evaluated: globalThis.__evaluated }));
