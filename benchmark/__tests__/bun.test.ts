import { describe, expect, test } from "bun:test";

import {
  acceptsBunLinter,
  linterChoices,
  listsBunLintCommand,
  printsUsableBunLint,
} from "../bun";

describe("listsBunLintCommand", () => {
  test("accepts a Bun that lists the lint command", () => {
    const help = [
      "Commands:",
      "  run       ./my-script.ts       Execute a file with Bun",
      "            dev                  Run a package.json script",
      "  check                          Type check a TypeScript project",
      "  lint                           Lint JavaScript and TypeScript, like ESLint",
      "  fmt                            Format JavaScript and TypeScript, like Prettier",
    ].join("\n");

    expect(listsBunLintCommand(help)).toBe(true);
  });

  // Bun 1.4.4 has `bun fmt` but not `bun lint`, and the example script under
  // `run` is picked at random.
  test("rejects a Bun whose help shows lint only as an example script", () => {
    const help = [
      "Commands:",
      "  run       ./my-script.ts       Execute a file with Bun",
      "            lint                 Run a package.json script",
      "  check                          Type check a TypeScript project",
      "  fmt                            Format JavaScript and TypeScript, like Prettier",
    ].join("\n");

    expect(listsBunLintCommand(help)).toBe(false);
  });

  test("rejects no output", () => {
    expect(listsBunLintCommand("")).toBe(false);
  });
});

describe("printsUsableBunLint", () => {
  test("accepts a Bun whose linter has --no-script", () => {
    const help = [
      "Usage: bun lint [flags] [...files, directories or patterns]",
      "  Find and fix problems in JavaScript and TypeScript.",
      "      --no-script                     Run the linter even if the project has a lint script",
    ].join("\n");

    expect(printsUsableBunLint(help)).toBe(true);
  });

  test("rejects a Bun whose linter predates --no-script", () => {
    expect(
      printsUsableBunLint(
        "Usage: bun lint [flags] [...files, directories or patterns]"
      )
    ).toBe(false);
  });

  test("rejects an older Bun, which looks for a lint script", () => {
    expect(printsUsableBunLint('error: Script not found "lint"')).toBe(false);
  });

  test("rejects no output", () => {
    expect(printsUsableBunLint("")).toBe(false);
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
