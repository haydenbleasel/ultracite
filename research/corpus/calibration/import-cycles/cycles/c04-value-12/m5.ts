import { step6 } from "./m6";

export const step5 = (depth: number): number =>
  depth <= 0 ? 5 : step6(depth - 1);
