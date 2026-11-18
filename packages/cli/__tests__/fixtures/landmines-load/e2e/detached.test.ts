import { expect, test } from "vitest";

import { tax } from "../src/money/tax.ts";

test("taxes", () => {
  expect(tax(10)).toBe(1);
});
