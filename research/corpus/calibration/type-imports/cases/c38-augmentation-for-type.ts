// A module that augments Service (types and a prototype method), imported for a class used only as
// a type. greet() exists at runtime only if augment.ts evaluated.
import { Greeter } from "../lib/augment.js";
import { Service } from "../lib/service.js";

let greeter: Greeter | undefined;
const service = new Service();
const out = [greeter ?? null, typeof service.greet === "function" ? service.greet() : "greet is missing"];
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
