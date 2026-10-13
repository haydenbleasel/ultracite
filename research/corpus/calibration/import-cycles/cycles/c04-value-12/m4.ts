import { step5 } from "./m5";

export const step4 = (depth: number): number =>
  depth <= 0 ? 4 : step5(depth - 1);
