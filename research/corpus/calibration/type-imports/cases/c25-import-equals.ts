// `import x = require()` used only as a type, and `import type x = require()`.
import fs = require("node:fs");
import type path = require("node:path");

let stats: fs.Stats | undefined;
let parsed: path.ParsedPath | undefined;
const out = [stats ?? null, parsed ?? null];
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
