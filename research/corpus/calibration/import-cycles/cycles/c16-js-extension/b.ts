import { formatA } from "./a.js";

export const formatB = (value: number): string =>
  value > 0 ? `b:${formatA(value - 1)}` : "b";
