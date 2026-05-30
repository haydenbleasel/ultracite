import { describe, expect, test } from "bun:test";

import { normalizeFileArgs, splitLinterArgs } from "../src/linter-args";

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
});
