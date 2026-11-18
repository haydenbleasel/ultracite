import { expect, test } from "vitest";

import { add } from "../src/math.ts";

test("adds", () => {
  expect(add(1, 2)).toBe(3);
});
