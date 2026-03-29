import { describe, expect, test } from "bun:test";

import { providers } from "./providers.ts";

describe("providers content", () => {
  test("supplementary logos include accessible alt text", () => {
    for (const provider of providers) {
      for (const logo of provider.additionalLogos ?? []) {
        expect(logo.alt.length).toBeGreaterThan(0);
        expect(logo.src).toBeDefined();
      }
    }
  });
});
