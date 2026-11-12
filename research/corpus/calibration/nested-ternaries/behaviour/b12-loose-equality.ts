// A chain written with == matches what a switch (===) doesn't.
export const calls: string[] = [];
export const inputs: unknown[] = [0, "0", "", null, undefined, false, 1];
export const original = (v: unknown): string =>
  // biome-ignore lint/suspicious/noDoubleEquals: the case is about ==
  v == 0 ? "zero" : v == null ? "nullish" : "other";
export const rewrites = {
  switch: (v: unknown): string => {
    switch (v) {
      case 0: {
        return "zero";
      }
      case null: {
        return "nullish";
      }
      default: {
        return "other";
      }
    }
  },
};
