import { describe, expect, test } from "bun:test";

import YAML from "yaml";

import {
  renderYamlDocument,
  replaceYamlStrings,
  someYamlString,
  usesIndentedSequences,
} from "../src/integrations/yaml-document";

// The root node of a parsed document.
const rootOf = (source: string): YAML.Node => {
  const { contents } = YAML.parseDocument(source);

  if (!YAML.isNode(contents)) {
    throw new Error("expected a YAML node");
  }

  return contents;
};

describe("usesIndentedSequences", () => {
  test("detects sequences indented under their key", () => {
    expect(usesIndentedSequences("repos:\n  - repo: local\n")).toBe(true);
  });

  test("detects sequences flush with their key", () => {
    expect(usesIndentedSequences("repos:\n-   repo: local\n")).toBe(false);
  });

  test("looks past comments and blank lines", () => {
    expect(usesIndentedSequences("repos:\n\n# first\n- repo: local\n")).toBe(
      false
    );
  });

  test("defaults to indented when there is no block sequence", () => {
    expect(usesIndentedSequences("pre-commit:\n  parallel: true\n")).toBe(true);
  });
});

describe("renderYamlDocument", () => {
  test("keeps the file's sequence style and comments", () => {
    const original = "# top\nrepos:\n- repo: a\n";
    const doc = YAML.parseDocument(original);
    const repos = doc.get("repos", true);

    if (!YAML.isSeq(repos)) {
      throw new Error("expected a sequence");
    }
    repos.add(doc.createNode({ repo: "b" }));

    expect(renderYamlDocument(doc, original)).toBe(
      "# top\nrepos:\n- repo: a\n- repo: b\n"
    );
  });

  test("never folds long commands", () => {
    const command = `npx ultracite fix ${"src/".repeat(40)}`;
    const doc = YAML.parseDocument("run: x\n");
    doc.set("run", command);

    expect(renderYamlDocument(doc, "")).toBe(`run: ${command}\n`);
  });
});

describe("someYamlString", () => {
  test("finds a matching string anywhere in the tree", () => {
    const root = rootOf("a:\n  - b: npx ultracite fix\n");
    expect(someYamlString(root, (value) => value.includes("ultracite"))).toBe(
      true
    );
    expect(someYamlString(root, (value) => value.includes("eslint"))).toBe(
      false
    );
  });
});

describe("replaceYamlStrings", () => {
  test("replaces values but never keys", () => {
    const root = rootOf("old: old\nlist:\n  - old\n");

    const changed = replaceYamlStrings(root, (value) => value === "old", "new");

    expect(changed).toBe(true);
    expect(root.toJSON()).toEqual({ list: ["new"], old: "new" });
  });

  test("reports no change when nothing matches", () => {
    expect(replaceYamlStrings(rootOf("a: b\n"), () => false, "x")).toBe(false);
  });
});
