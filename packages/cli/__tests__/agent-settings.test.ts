import { describe, expect, test } from "bun:test";

import { mergeAgentSettings } from "../src/agent-settings";

const aider = { lintKey: "lint-cmd", path: ".aider.conf.yml", readKey: "read" };
const merge = (existing: string, fixCommand = "npx ultracite fix") =>
  mergeAgentSettings(existing, aider, "AGENTS.md", fixCommand);

describe("mergeAgentSettings", () => {
  test("writes both keys into a new file", () => {
    expect(merge("")).toBe("read: AGENTS.md\nlint-cmd: npx ultracite fix\n");
  });

  test("adds the rules file beside a file the user already reads", () => {
    expect(merge("# Mine\nmodel: sonnet\nread: CONVENTIONS.md\n")).toBe(
      "# Mine\nmodel: sonnet\nread:\n  - CONVENTIONS.md\n  - AGENTS.md\nlint-cmd: npx ultracite fix\n"
    );
  });

  test("edits a read list in place, keeping comments and dropping ultracite.md", () => {
    expect(
      merge("read:\n  - CONVENTIONS.md # team rules\n  - ultracite.md\n")
    ).toBe(
      "read:\n  - CONVENTIONS.md # team rules\n  - AGENTS.md\nlint-cmd: npx ultracite fix\n"
    );
  });

  test("replaces a read of the old ultracite.md", () => {
    expect(merge("read: ultracite.md\n")).toBe(
      "read: AGENTS.md\nlint-cmd: npx ultracite fix\n"
    );
  });

  test("leaves a file that's already set up unchanged", () => {
    const existing = "read: AGENTS.md\nlint-cmd: npx ultracite fix\n";
    expect(merge(existing)).toBe(existing);
  });

  test("updates Ultracite's lint command to the project's runner", () => {
    expect(
      merge(
        "read: AGENTS.md\nlint-cmd: npx ultracite fix\n",
        "pnpm exec ultracite fix"
      )
    ).toBe("read: AGENTS.md\nlint-cmd: pnpm exec ultracite fix\n");
  });

  test("keeps a lint command that isn't Ultracite's", () => {
    expect(merge('lint-cmd: "python: flake8"\n')).toBe(
      'lint-cmd: "python: flake8"\nread: AGENTS.md\n'
    );
  });

  test("updates Ultracite's entry in a list of lint commands", () => {
    expect(
      merge('lint-cmd:\n  - "python: flake8"\n  - yarn ultracite fix\n')
    ).toBe(
      'lint-cmd:\n  - "python: flake8"\n  - npx ultracite fix\nread: AGENTS.md\n'
    );
  });

  test("refuses a read that isn't a file name or a list", () => {
    expect(() => merge("read:\n  file: AGENTS.md\n")).toThrow(
      "Expected read in .aider.conf.yml to be a file name or a list of them."
    );
  });

  test("refuses a file it can't parse", () => {
    expect(() => merge("read: [unclosed\n")).toThrow(
      "Couldn't parse .aider.conf.yml"
    );
  });
});
