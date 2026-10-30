// C25: recursion: a declaration and a const arrow without a return type.
export function depth(node: { children: unknown[] }): number {
  return 1 + Math.max(0, ...node.children.map((c) => depth(c as { children: unknown[] })));
}

export const depthConst = (node: { children: unknown[] }) =>
  1 + Math.max(0, ...node.children.map((c) => depthConst(c as { children: unknown[] })));
