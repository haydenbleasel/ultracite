import { step7 } from "./m7";

export const step6 = (depth: number): number =>
  depth <= 0 ? 6 : step7(depth - 1);
