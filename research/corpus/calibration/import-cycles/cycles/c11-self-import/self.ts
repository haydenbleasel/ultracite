import { helper as same } from "./self";

export const helper = (): number => 1;
export const twice = (): number => same() * 2;
