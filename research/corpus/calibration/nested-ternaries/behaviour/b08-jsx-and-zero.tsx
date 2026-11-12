// `count && <X/>` renders 0 where `count ? <X/> : null` renders nothing.
export const calls: string[] = [];
type Node = { type: string; props: Record<string, unknown>; children: unknown[] } | string | number | boolean | null | undefined;
const h = (type: string, props: Record<string, unknown> | null, ...children: unknown[]): Node => ({ children, props: props ?? {}, type });
// React's rule: strings and numbers render, booleans, null and undefined don't
export const render = (n: unknown): string => {
  if (n === null || n === undefined || typeof n === "boolean") {
    return "";
  }
  if (typeof n === "string" || typeof n === "number") {
    return String(n);
  }
  if (Array.isArray(n)) {
    return n.map(render).join("");
  }
  const el = n as { type: string; children: unknown[] };
  return `<${el.type}>${el.children.map(render).join("")}</${el.type}>`;
};
export const inputs = [
  { count: 0, loading: false },
  { count: 3, loading: false },
  { count: 0, loading: true },
];
export const original = ({ count, loading }: { count: number; loading: boolean }): Node =>
  h("div", null, loading ? h("p", null, "Loading") : count ? h("p", null, count, " items") : h("p", null, "Empty"));
export const rewrites = {
  andChain: ({ count, loading }: { count: number; loading: boolean }): Node =>
    h("div", null, loading && h("p", null, "Loading"), !loading && count && h("p", null, count, " items"), !loading && !count && h("p", null, "Empty")),
  earlyReturn: ({ count, loading }: { count: number; loading: boolean }): Node => {
    if (loading) {
      return h("div", null, h("p", null, "Loading"));
    }
    if (count) {
      return h("div", null, h("p", null, count, " items"));
    }
    return h("div", null, h("p", null, "Empty"));
  },
  andChainBoolean: ({ count, loading }: { count: number; loading: boolean }): Node =>
    h("div", null, loading && h("p", null, "Loading"), !loading && count > 0 && h("p", null, count, " items"), !loading && count === 0 && h("p", null, "Empty")),
};
