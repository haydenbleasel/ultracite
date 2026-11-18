// What some compilers leave behind for an inline-only import, written by hand (control).
import {} from "./y.js";

(globalThis.__evaluated ??= []).push("entry");
console.log(JSON.stringify({ evaluated: globalThis.__evaluated }));
