import { formatB } from "./b.js";

export const formatA = (value: number): string =>
  value > 0 ? `a:${formatB(value - 1)}` : "a";
