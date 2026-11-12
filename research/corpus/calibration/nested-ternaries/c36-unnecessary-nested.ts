// A nested ternary unicorn/no-unnecessary-nested-ternary collapses.
export const pick = (a: boolean, b: boolean): string => (a ? (b ? "both" : "neither") : "neither");
