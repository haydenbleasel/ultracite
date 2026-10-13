import { step4 } from "./m4";

export const step3 = (depth: number): number =>
  depth <= 0 ? 3 : step4(depth - 1);
