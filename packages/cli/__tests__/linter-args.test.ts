import { describe, expect, test } from "bun:test";

import {
  normalizeFileArgs,
  splitLinterArgs,
  toStylelintTargets,
} from "../src/linter-args";

describe("linter args", () => {
  test("keeps existing hyphen-prefixed paths as files", () => {
    const result = splitLinterArgs({
      commandName: "fix",
      parsedArgs: ["src/index.ts", "--config=evil.mjs", "-hyphen-file.ts"],
      pathExists: (path) =>
        path === "--config=evil.mjs" || path === "-hyphen-file.ts",
    });

    expect(result).toEqual({
      files: ["src/index.ts", "--config=evil.mjs", "-hyphen-file.ts"],
      passthrough: [],
    });
  });

  test("keeps non-path hyphen-prefixed args as linter passthrough", () => {
    const result = splitLinterArgs({
      commandName: "check",
      parsedArgs: ["--type-aware", "src/index.ts"],
      pathExists: () => false,
    });

    expect(result).toEqual({
      files: ["src/index.ts"],
      passthrough: ["--type-aware"],
    });
  });

  test("uses explicit separator to keep following args as files", () => {
    const result = splitLinterArgs({
      commandName: "fix",
      parsedArgs: ["--type-aware", "--config=evil.mjs"],
      pathExists: () => false,
      rawArgs: [
        "bun",
        "ultracite",
        "fix",
        "--type-aware",
        "--",
        "--config=evil.mjs",
      ],
    });

    expect(result).toEqual({
      files: ["--config=evil.mjs"],
      passthrough: ["--type-aware"],
    });
  });

  test("normalizes hyphen-prefixed file args before linter delegation", () => {
    expect(normalizeFileArgs(["--config=evil.mjs", "-hyphen-file.ts"])).toEqual(
      ["./--config=evil.mjs", "./-hyphen-file.ts"]
    );
  });

  test("returns a style glob when no files are given", () => {
    expect(toStylelintTargets([])).toEqual(["**/*.{css,scss,sass,less}"]);
  });

  test("keeps style files and drops other files", () => {
    expect(
      toStylelintTargets(["src/styles.css", "theme.SCSS", "src/index.ts"])
    ).toEqual(["src/styles.css", "theme.SCSS"]);
  });

  test("maps directories to style-scoped globs", () => {
    expect(toStylelintTargets(["src", "./lib/", "."])).toEqual([
      "src/**/*.{css,scss,sass,less}",
      "./lib/**/*.{css,scss,sass,less}",
      "**/*.{css,scss,sass,less}",
    ]);
  });

  test("returns no targets when only non-style files are given", () => {
    expect(toStylelintTargets(["src/index.ts", "package.json"])).toEqual([]);
  });
});
