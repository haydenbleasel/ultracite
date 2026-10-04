import { describe, expect, test } from "bun:test";

import {
  biomeConfigSchema,
  detectJsonFormatting,
  parseJsoncStrict,
  parsePackageJson,
} from "../src/schemas";

describe("parsePackageJson", () => {
  test("keeps the document's key order", () => {
    // A string, not an object literal: the repo's sort-keys autofix would
    // reorder the keys this test is about.
    const parsed = parsePackageJson(
      '{"name": "app", "version": "1.0.0", "private": true, "scripts": {"build": "tsc"}, "devDependencies": {"typescript": "^5"}, "main": "index.js"}'
    );

    expect(Object.keys(parsed ?? {})).toEqual([
      "name",
      "version",
      "private",
      "scripts",
      "devDependencies",
      "main",
    ]);
  });

  test("rejects a document that doesn't match the schema", () => {
    expect(parsePackageJson('{"dependencies": ["react"]}')).toBeUndefined();
  });
});

describe("parseJsoncStrict", () => {
  test("accepts comments and trailing commas", () => {
    expect(
      parseJsoncStrict(
        '{\n  // comment\n  "extends": ["a",],\n}',
        biomeConfigSchema
      )
    ).toEqual({ extends: ["a"] });
  });

  test("returns undefined instead of a partial recovery on syntax errors", () => {
    expect(
      parseJsoncStrict('{ "extends": ["a"], "files": {', biomeConfigSchema)
    ).toBeUndefined();
  });

  test("accepts Biome's string extends", () => {
    expect(parseJsoncStrict('{ "extends": "//" }', biomeConfigSchema)).toEqual({
      extends: "//",
    });
  });
});

describe("detectJsonFormatting", () => {
  test("detects spaces, tabs and line endings", () => {
    expect(detectJsonFormatting('{\n    "a": 1\n}')).toEqual({
      eol: "\n",
      insertSpaces: true,
      tabSize: 4,
    });
    expect(detectJsonFormatting('{\r\n\t"a": 1\r\n}')).toEqual({
      eol: "\r\n",
      insertSpaces: false,
      tabSize: 1,
    });
    expect(detectJsonFormatting("{}")).toEqual({
      eol: "\n",
      insertSpaces: true,
      tabSize: 2,
    });
  });
});
