// C32: a function merged with a namespace (a const can't merge).
export function plugin(): string {
  return plugin.version;
}
export namespace plugin {
  export const version = "1.0.0";
}
