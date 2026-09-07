import { describe, expect, test } from "bun:test";

import githubRules from "../config/eslint/core/rules/github.mjs";
import jsPlugins from "../config/oxlint/js-plugins/index.mjs";
import { githubFilenameRegex } from "../config/shared/filenames.mjs";

const filenameRegex = new RegExp(githubFilenameRegex, "u");

const validGenericFilenames = ["file-name", "fileName", "foo.bar"];
const validTanstackFilenames = [
  "__root",
  "$",
  "$postId",
  "_pathlessLayout",
  "_app.a",
  "posts.$postId",
  "posts_.$postId.edit",
  "files.$",
  "posts.index",
  "blog.post.route",
  "script[.]js",
  "api[.]v1",
  "[home-page]",
  "-components",
  "posts.{-$category}",
  "posts.{-$category}.{-$slug}",
  "{-$locale}.about",
  "posts.post-{$postId}",
  "files.{$fileName}[.]txt",
  "users.user-{$userId}[.]json",
  "files.prefix{-$name}[.]txt",
];
const invalidFilenames = [
  "fileNameRule",
  "Foo",
  "__root.foo",
  "_",
  "_$postId",
  "posts..edit",
  "posts.$postId..edit",
  "foo$bar",
  "foo_bar",
  "foo__",
  "foo[bar",
  "foo]bar",
  "posts.{-$}",
  "posts.{$}",
  "posts.{-$category",
];

describe("github filename regex", () => {
  test("preserves the GitHub convention for ordinary filenames", () => {
    for (const filename of validGenericFilenames) {
      expect(filenameRegex.test(filename), filename).toBe(true);
    }
  });

  test("accepts documented TanStack Router filename syntax", () => {
    for (const filename of validTanstackFilenames) {
      expect(filenameRegex.test(filename), filename).toBe(true);
    }
  });

  test("rejects malformed TanStack syntax and invalid ordinary filenames", () => {
    for (const filename of invalidFilenames) {
      expect(filenameRegex.test(filename), filename).toBe(false);
    }
  });

  test("keeps the ESLint and Oxlint GitHub rule options in sync", () => {
    const expectedRule: ["error", string] = ["error", githubFilenameRegex];

    expect(githubRules["github/filenames-match-regex"]).toEqual(expectedRule);
    expect(jsPlugins.rules?.["github/filenames-match-regex"]).toEqual(
      expectedRule
    );
  });
});
