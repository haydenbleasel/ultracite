// Module augmentation with runtime code: it declares a method on Service's type and installs it on
// the prototype. Importers that only take its type still need it to evaluate.
import { Service } from "./service.js";

(globalThis.__evaluated ??= []).push("augment");
declare module "./service.js" {
  interface Service {
    greet(): string;
  }
}
Service.prototype.greet = function greet(this: Service): string {
  return `hello from ${this.name}`;
};
export class Greeter {
  kind = "greeter";
}
