// A top-level `import type`.
import type { X } from "./y.js";

const a: X = { a: 1 };
(globalThis.__evaluated ??= []).push("entry");
console.log(JSON.stringify({ a, evaluated: globalThis.__evaluated }));
