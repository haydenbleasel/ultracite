// c06 after the fix: the injected class imported with `import type`.
import { Injectable, resolve } from "../lib/di.js";
import type { Service } from "../lib/service.js";

@Injectable()
class Consumer {
  constructor(readonly service: Service) {}
}
let out: unknown;
try {
  out = (resolve(Consumer as never) as Consumer).service.name;
} catch (error) {
  out = String((error as Error).message);
}
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
