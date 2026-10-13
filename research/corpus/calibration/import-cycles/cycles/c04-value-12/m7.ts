import { step8 } from "./m8";

export const step7 = (depth: number): number =>
  depth <= 0 ? 7 : step8(depth - 1);
