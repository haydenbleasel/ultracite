import { step12 } from "./m12";

export const step11 = (depth: number): number =>
  depth <= 0 ? 11 : step12(depth - 1);
