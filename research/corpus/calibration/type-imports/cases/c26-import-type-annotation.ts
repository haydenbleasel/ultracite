// `import()` types, with and without typeof (disallowTypeAnnotations).
let s: import("../lib/service.js").Service | undefined;
type ServiceModule = typeof import("../lib/service.js");
const moduleName: keyof ServiceModule = "Service";
const out = [s ?? null, moduleName];
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
