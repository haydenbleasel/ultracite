// A four-way chain, as a ternary, an else-if chain, early returns and a switch: what sonarjs scores each.
export const ternary = (n: number): string => (n === 1 ? "one" : n === 2 ? "two" : n === 3 ? "three" : "many");
export const elseIf = (n: number): string => {
  let out: string;
  if (n === 1) {
    out = "one";
  } else if (n === 2) {
    out = "two";
  } else if (n === 3) {
    out = "three";
  } else {
    out = "many";
  }
  return out;
};
export const earlyReturn = (n: number): string => {
  if (n === 1) {
    return "one";
  }
  if (n === 2) {
    return "two";
  }
  if (n === 3) {
    return "three";
  }
  return "many";
};
export const switched = (n: number): string => {
  switch (n) {
    case 1: {
      return "one";
    }
    case 2: {
      return "two";
    }
    case 3: {
      return "three";
    }
    default: {
      return "many";
    }
  }
};
export const lookup = (n: number): string => ({ 1: "one", 2: "two", 3: "three" })[n] ?? "many";
export const insideLoop = (ns: number[]): string[] => {
  const out: string[] = [];
  for (const n of ns) {
    out.push(n === 1 ? "one" : n === 2 ? "two" : "many");
  }
  return out;
};
