// Gaming move: the import replaced by a local structural type.
type Service = { name: string };

let s: Service | undefined;
const out = s ?? null;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
