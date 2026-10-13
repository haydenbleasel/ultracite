import { step11 } from "./m11";

export const step10 = (depth: number): number =>
  depth <= 0 ? 10 : step11(depth - 1);
