// The ternary evaluates its discriminant once per test; a switch evaluates it once.
export const calls: string[] = [];
let tick = 0;
const next = (): string => {
  calls.push("next");
  tick++;
  return tick % 3 === 0 ? "c" : tick % 3 === 1 ? "a" : "b";
};
export const inputs = [0, 1, 2, 3];
export const reset = (): void => {
  tick = 0;
};
export const original = (_: number): number => (next() === "a" ? 1 : next() === "b" ? 2 : 3);
export const rewrites = {
  switch: (_: number): number => {
    switch (next()) {
      case "a": {
        return 1;
      }
      case "b": {
        return 2;
      }
      default: {
        return 3;
      }
    }
  },
};
