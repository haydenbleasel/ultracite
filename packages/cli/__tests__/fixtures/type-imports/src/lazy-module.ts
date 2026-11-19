const cats = require("./cat") as typeof import("./cat");

export const nameOf = (name: string): string => cats.describeCat({ name });
