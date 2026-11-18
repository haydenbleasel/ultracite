// Gaming move: one ESLint-style directive naming both spellings of the rule (Oxlint reads
// eslint-disable comments), with Biome's directive above it.
// biome-ignore lint/style/useImportType: kept as a value import
// eslint-disable-next-line @typescript-eslint/consistent-type-imports, typescript/consistent-type-imports
import { Service } from "../lib/service.js";

let s: Service | undefined;
const out = s ?? null;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
