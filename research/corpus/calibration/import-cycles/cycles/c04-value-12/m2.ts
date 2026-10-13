import { step3 } from "./m3";

export const step2 = (depth: number): number =>
  depth <= 0 ? 2 : step3(depth - 1);
