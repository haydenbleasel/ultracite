import { describe, expect, test } from "bun:test";
/**
 * Oxlint config rule conflict tests
 *
 * These tests validate that mutually exclusive rules in oxlint configs are
 * not both enabled simultaneously. When two rules conflict, one must be
 * explicitly disabled.
 */
import { join } from "node:path";

const readOxlintConfig = async (name: string) => {
  const configPath = join(
    import.meta.dirname,
    `../config/oxlint/${name}/oxlint.config.ts`
  );
  const mod = await import(configPath);
  return mod.default;
};

const isEnabled = (rule: unknown) => rule === "error" || rule === "warn";

describe("oxlint vitest config", () => {
  /**
   * prefer-called-once vs prefer-called-times
   *
   * These two rules are mutually exclusive and enforce opposite styles:
   * - prefer-called-once: enforce toHaveBeenCalledOnce() over toHaveBeenCalledTimes(1)
   * - prefer-called-times: enforce toHaveBeenCalledTimes(1) over toHaveBeenCalledOnce()
   *
   * Enabling both causes an unfixable conflict: any valid code would trigger one of
   * the two rules simultaneously. The ESLint vitest config resolves this by disabling
   * prefer-called-times (see packages/cli/config/eslint/vitest/rules/vitest.mjs).
   * The oxlint vitest config must be consistent.
   */
  describe("prefer-called-once vs prefer-called-times conflict", () => {
    test("prefer-called-times is explicitly disabled to avoid conflict with prefer-called-once", async () => {
      const config = await readOxlintConfig("vitest");
      const rules = config.overrides?.[0]?.rules ?? {};

      // prefer-called-times must be "off" — it directly contradicts prefer-called-once
      expect(rules["vitest/prefer-called-times"]).toBe("off");
    });

    test("prefer-called-once and prefer-called-times are not both enabled", async () => {
      const config = await readOxlintConfig("vitest");
      const rules = config.overrides?.[0]?.rules ?? {};

      const calledOnceEnabled = isEnabled(rules["vitest/prefer-called-once"]);
      const calledTimesEnabled = isEnabled(rules["vitest/prefer-called-times"]);

      expect(
        calledOnceEnabled && calledTimesEnabled,
        "prefer-called-once and prefer-called-times are both enabled — they conflict: one enforces toHaveBeenCalledOnce(), the other enforces toHaveBeenCalledTimes(1)"
      ).toBe(false);
    });
  });

  /**
   * prefer-to-be-truthy/falsy vs prefer-strict-boolean-matchers
   *
   * These rules are mutually exclusive and enforce opposite styles:
   * - prefer-to-be-truthy: enforce toBeTruthy() over toBe(true)
   * - prefer-to-be-falsy: enforce toBeFalsy() over toBe(false)
   * - prefer-strict-boolean-matchers: enforce toBe(true)/toBe(false) over toBeTruthy()/toBeFalsy()
   *
   * Enabling both causes an unfixable conflict. The ESLint vitest config resolves this by
   * disabling prefer-strict-boolean-matchers (see packages/cli/config/eslint/vitest/rules/vitest.mjs).
   * The oxlint vitest config must be consistent.
   */
  describe("prefer-to-be-truthy/falsy vs prefer-strict-boolean-matchers conflict", () => {
    test("prefer-strict-boolean-matchers is explicitly disabled to avoid conflict", async () => {
      const config = await readOxlintConfig("vitest");
      const rules = config.overrides?.[0]?.rules ?? {};

      expect(rules["vitest/prefer-strict-boolean-matchers"]).toBe("off");
    });

    test("prefer-strict-boolean-matchers is not enabled alongside prefer-to-be-truthy or prefer-to-be-falsy", async () => {
      const config = await readOxlintConfig("vitest");
      const rules = config.overrides?.[0]?.rules ?? {};

      const strictBooleanEnabled = isEnabled(
        rules["vitest/prefer-strict-boolean-matchers"]
      );
      const truthyEnabled = isEnabled(rules["vitest/prefer-to-be-truthy"]);
      const falsyEnabled = isEnabled(rules["vitest/prefer-to-be-falsy"]);

      expect(
        strictBooleanEnabled && (truthyEnabled || falsyEnabled),
        "prefer-strict-boolean-matchers conflicts with prefer-to-be-truthy/prefer-to-be-falsy — they enforce opposite matcher styles"
      ).toBe(false);
    });
  });
});
