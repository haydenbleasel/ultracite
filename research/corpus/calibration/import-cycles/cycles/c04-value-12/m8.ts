import { step9 } from "./m9";

export const step8 = (depth: number): number =>
  depth <= 0 ? 8 : step9(depth - 1);
