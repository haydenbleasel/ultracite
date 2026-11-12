// An && / || chain falls through a falsy branch value.
export const calls: string[] = [];
export const inputs = [0, 3, 6, 9, 12];
export const original = (n: number): number | string => (n > 10 ? 0 : n > 5 ? "" : n > 2 ? "few" : "none");
export const rewrites = {
  logical: (n: number): number | string => (n > 10 && 0) || (n > 5 && "") || (n > 2 && "few") || "none",
};
