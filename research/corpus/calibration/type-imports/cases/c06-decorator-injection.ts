// Constructor injection: the injected class appears only as a parameter type, and the container
// constructs it from the design:paramtypes metadata TypeScript emits under emitDecoratorMetadata.
import { Injectable, resolve } from "../lib/di.js";
import { Service } from "../lib/service.js";

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
