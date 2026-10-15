import { describe, expect, test } from "bun:test";

import { acceptsBunLinter, linterChoices, printsBunLintUsage } from "../bun";

describe("printsBunLintUsage", () => {
  test("accepts the usage a Bun with the linter prints", () => {
    const help = [
      "Usage: bun lint [flags] [...files, directories or patterns]",
      "  Find and fix problems in JavaScript and TypeScript.",
    ].join("\n");

    expect(printsBunLintUsage(help)).toBe(true);
  });

  test("rejects an older Bun, which looks for a lint script", () => {
    expect(printsBunLintUsage('error: Script not found "lint"')).toBe(false);
  });

  test("rejects no output", () => {
    expect(printsBunLintUsage("")).toBe(false);
  });
});

describe("linterChoices", () => {
  test("reads the values from init's help", () => {
    const help =
      "  --linter <linter>    Linter to use (biome, bun, eslint, oxlint)\n  --editors <editors...>";

    expect(linterChoices(help)).toEqual(["biome", "bun", "eslint", "oxlint"]);
  });

  test("reads values Commander wrapped onto the next line", () => {
    const help =
      "  --linter <linter>    Linter to use (biome, bun,\n                       eslint, oxlint)";

    expect(linterChoices(help)).toEqual(["biome", "bun", "eslint", "oxlint"]);
  });

  test("gives none for a build that lists no values", () => {
    expect(linterChoices("  --linter <linter>    Linter to use\n")).toEqual([]);
  });
});

describe("acceptsBunLinter", () => {
  test("accepts a build that lists bun", () => {
    expect(acceptsBunLinter("Linter to use (biome, bun, eslint, oxlint)")).toBe(
      true
    );
  });

  test.each([
    ["lists only the other linters", "Linter to use (biome, eslint, oxlint)"],
    ["lists no linters", "Linter to use"],
    ["printed no help", ""],
  ])("rejects a build that %s", (_name, help) => {
    expect(acceptsBunLinter(help)).toBe(false);
  });
});
