import { formatA } from "./a";

export const formatB = (value: number): string =>
  value > 0 ? `b:${formatA(value - 1)}` : "b";
