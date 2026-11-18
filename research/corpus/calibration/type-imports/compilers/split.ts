// The same mix written the way prefer-top-level's fix writes it: two declarations.
import type { X } from "./y.js";
import { value } from "./y.js";

const a: X = { a: value };
(globalThis.__evaluated ??= []).push("entry");
console.log(JSON.stringify({ a, evaluated: globalThis.__evaluated }));
