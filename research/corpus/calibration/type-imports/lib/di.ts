// A minimal dependency-injection container, the way NestJS and Angular resolve constructor
// parameters: it reads the `design:paramtypes` metadata TypeScript emits under
// emitDecoratorMetadata, then constructs each parameter's class. Includes a tiny stand-in for the
// reflect-metadata polyfill (Reflect.metadata), which the emitted `__metadata` helper calls.
(globalThis.__evaluated ??= []).push("di");
const store = new Map<string, unknown>();
const ids = new WeakMap<object, number>();
const idOf = (o: object): number => {
  if (typeof o !== "object" && typeof o !== "function") {
    return 0;
  }
  if (!ids.has(o)) {
    ids.set(o, ids.size + 1);
  }
  return ids.get(o) ?? 0;
};
const reflect = Reflect as unknown as Record<string, unknown>;
reflect.metadata =
  (key: string, value: unknown) =>
  (target: object, property?: string): void => {
    store.set(`${idOf(target)}:${property ?? ""}:${key}`, value);
  };
const getMetadata = (key: string, target: object, property?: string): unknown =>
  store.get(`${idOf(target)}:${property ?? ""}:${key}`);
const nameOf = (p: unknown): string => (typeof p === "function" ? p.name : String(p));
type Ctor = new (...args: unknown[]) => unknown;
export const Injectable =
  () =>
  (target: Ctor): void => {
    if (typeof target !== "function") {
      return;
    }
    const params = getMetadata("design:paramtypes", target);
    (globalThis.__metadata ??= {})[`${target.name} design:paramtypes`] = Array.isArray(params)
      ? params.map(nameOf)
      : null;
  };
export const Inject =
  () =>
  (target: object, property: string): void => {
    if (typeof property !== "string") {
      // standard (TC39) decorators pass a context object and emit no metadata
      return;
    }
    (globalThis.__metadata ??= {})[`${property} design:type`] = nameOf(
      getMetadata("design:type", target, property)
    );
  };
export const resolve = (target: Ctor): unknown => {
  const params = (getMetadata("design:paramtypes", target) ?? []) as unknown[];
  const args = params.map((p) => {
    if (typeof p !== "function" || p === Object || p === Function) {
      throw new Error(`cannot resolve a parameter of ${target.name}: ${nameOf(p)}`);
    }
    return new (p as Ctor)();
  });
  return new target(...args);
};
