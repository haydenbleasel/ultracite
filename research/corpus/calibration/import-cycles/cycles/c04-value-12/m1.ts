import { step2 } from "./m2";

export const step1 = (depth: number): number =>
  depth <= 0 ? 1 : step2(depth - 1);
