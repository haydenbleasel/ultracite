// C19: type positions: a type alias and `typeof fn` before their definitions.
export const make = (): Shape => ({ kind: "circle" });

export type MakeFn = typeof makeLater;

type Shape = { kind: string };

function makeLater(): Shape {
  return { kind: "square" };
}
export { makeLater };
