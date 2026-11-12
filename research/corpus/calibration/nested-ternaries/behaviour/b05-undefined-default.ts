// `?? fallback` replaces a branch that is legitimately undefined or null.
export const calls: string[] = [];
interface Options {
  dev?: string;
  prod?: string | null;
}
export const inputs: [string, Options][] = [
  ["dev", { dev: "d", prod: "p" }],
  ["dev", { prod: "p" }],
  ["prod", { dev: "d", prod: null }],
  ["test", { dev: "d" }],
];
export const original = ([env, o]: [string, Options]): unknown =>
  env === "dev" ? o.dev : env === "prod" ? o.prod : "default";
export const rewrites = {
  lookup: ([env, o]: [string, Options]): unknown =>
    ({ dev: o.dev, prod: o.prod } as Record<string, unknown>)[env] ?? "default",
};
