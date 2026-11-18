// A value imported and never used (control: elided by default, kept by verbatimModuleSyntax).
import { value } from "./y.js";

(globalThis.__evaluated ??= []).push("entry");
console.log(JSON.stringify({ evaluated: globalThis.__evaluated }));
