import * as utils from "./utils";

export const apply = (name: "add" | "sub"): number => utils[name](1, 2);
