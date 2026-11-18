// Gaming move: each linter's suppression comment stacked above a type-only import. A
// "next-line" directive covers only the line below it, so in a stack only the last one is next to
// the import.
// oxlint-disable-next-line typescript/consistent-type-imports
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
// biome-ignore lint/style/useImportType: kept as a value import
import { Service } from "../lib/service.js";

let s: Service | undefined;
const out = s ?? null;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
