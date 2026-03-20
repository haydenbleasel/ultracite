import { describe, expect, test } from "bun:test";
/**
 * Oxlint config rule conflict tests
 *
 * These tests validate that mutually exclusive rules in oxlint configs are
 * not both enabled simultaneously. When two rules conflict, one must be
 * explicitly disabled.
 */
import { join } from "node:path";

const stripJsonComments = (content: string): string =>
  content
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/\/\/.*$/gm, "")
    .replaceAll(/,(\s*[}\]])/g, "$1");

const readOxlintConfig = async (name: string) => {
  const configPath = join(
    import.meta.dirname,
    `../config/oxlint/${name}/.oxlintrc.json`
  );
  // Use Bun.file to avoid node:fs/promises mocks from other test files
  const content = await Bun.file(configPath).text();
  return JSON.parse(stripJsonComments(content));
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
});
