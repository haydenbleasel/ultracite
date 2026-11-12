// A nested ternary in a default parameter.
export const indent = (
  level: number,
  unit = level > 4 ? "\t" : level > 2 ? "    " : "  "
): string => unit.repeat(level);
