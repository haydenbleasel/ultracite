// A type imported without any `type` marker (what consistent-type-imports reports).
import { X } from "./y.js";

const a: X = { a: 1 };
(globalThis.__evaluated ??= []).push("entry");
console.log(JSON.stringify({ a, evaluated: globalThis.__evaluated }));
