// A local interface exported from an export list without `type`, and one with it.
interface Local {
  a: number;
}
interface Other {
  b: number;
}
export { Local };
export type { Other };
const out = "loaded";
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
