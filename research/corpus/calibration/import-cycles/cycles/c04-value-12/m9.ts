import { step10 } from "./m10";

export const step9 = (depth: number): number =>
  depth <= 0 ? 9 : step10(depth - 1);
