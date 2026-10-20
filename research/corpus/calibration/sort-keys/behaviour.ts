// Calibration cases where key order can change what a program does. Each export is a function
// whose return value is the case's observable result; sort-keys-linters.cjs --calibration runs
// them before and after each fix (and after a hand sort by ESLint's own grouping) and compares
// the results, key order included.

import { createHash } from "node:crypto";

const log: string[] = [];
const note = <T>(label: string, value: T): T => {
  log.push(label);
  return value;
};
const tick = (label: string): Promise<string> =>
  new Promise((done) => {
    log.push(`start ${label}`);
    setTimeout(() => {
      log.push(`end ${label}`);
      done(label);
    }, 0);
  });

export const B01 = () => {
  log.length = 0;
  const o = { b: note("b", 1), a: note("a", 2) };
  return { calls: [...log], keys: Object.keys(o) };
};
export const B02 = () => {
  log.length = 0;
  const kb = "b";
  const ka = "a";
  const o = { [kb]: note("b", 1), [ka]: note("a", 2) };
  return { calls: [...log], keys: Object.keys(o) };
};
export const B03 = () => {
  let i = 0;
  const o = { b: i++, a: i++ };
  return { a: o.a, b: o.b };
};
export const B04 = () => {
  let reads = 0;
  const source = {
    get next() {
      reads++;
      return reads;
    },
  };
  const o = { second: source.next, first: source.next };
  return { first: o.first, second: o.second };
};
export const B05 = () => {
  const defaults = { color: "red", size: 1 };
  const merged = { size: 2, ...defaults, color: "blue", align: "left" };
  return { json: JSON.stringify(merged), values: { align: merged.align, color: merged.color, size: merged.size } };
};
export const B07 = () => JSON.stringify({ type: "update", path: "/a.ts", timestamp: 1 });
export const B08 = () => Object.keys({ zebra: 1, apple: 2, mango: 3 });
export const B09 = () => {
  const routes = { "/users/new": "create", "/users/": "list", "/": "home" };
  const match = (url: string) => {
    for (const prefix in routes) {
      if (url.startsWith(prefix)) {
        return routes[prefix as keyof typeof routes];
      }
    }
    return null;
  };
  return ["/users/new", "/users/42", "/about"].map(match);
};
export const B10 = () => {
  const exportsMap = { import: "./index.mjs", require: "./index.cjs", default: "./index.js" };
  const resolve = (conditions: string[]) => {
    for (const [condition, target] of Object.entries(exportsMap)) {
      if (condition === "default" || conditions.includes(condition)) {
        return target;
      }
    }
    return null;
  };
  return [resolve(["import"]), resolve(["require"]), resolve([])];
};
export const B11 = () => [...new Map(Object.entries({ second: 2, first: 1 })).keys()];
export const B12 = () => Object.keys({ b: 1, 2: 1, a: 1, 1: 1 });
export const B13 = () => {
  const o = { b: 1, __proto__: { inherited: true }, a: 2 } as { a: number; b: number; inherited?: boolean };
  return { inherited: o.inherited, keys: Object.keys(o) };
};
export const B14 = async () => {
  log.length = 0;
  const o = { b: await tick("b"), a: await tick("a") };
  return { calls: [...log], keys: Object.keys(o) };
};
export const B16 = () => new URLSearchParams({ q: "sort keys", page: "2" }).toString();
export const B17 = () => Object.keys({ ...{ second: 2, first: 1 } });
export const B18 = () => {
  const person = {
    get full() {
      return `${this.first} ${this.last}`;
    },
    last: "Lovelace",
    first: "Ada",
  };
  return person.full;
};
export const B20 = () =>
  createHash("sha256")
    .update(JSON.stringify({ version: 2, entry: "src/main.ts", mode: "production" }))
    .digest("hex")
    .slice(0, 16);
