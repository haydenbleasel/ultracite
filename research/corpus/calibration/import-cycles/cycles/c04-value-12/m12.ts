import { step1 } from "./m1";

export const step12 = (depth: number): number =>
  depth <= 0 ? 12 : step1(depth - 1);
