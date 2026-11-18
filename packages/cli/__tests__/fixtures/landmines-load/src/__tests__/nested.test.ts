import { expect, test } from "vitest";

import { add } from "../math.ts";

test("adds", () => {
  expect(add(1, 2)).toBe(3);
});
