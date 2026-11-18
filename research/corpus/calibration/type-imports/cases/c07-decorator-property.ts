// A decorated property whose type is an imported class (design:type).
import { Inject } from "../lib/di.js";
import { Service } from "../lib/service.js";

class Holder {
  @Inject() service!: Service;
}
const out = new Holder().service ?? null;
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
