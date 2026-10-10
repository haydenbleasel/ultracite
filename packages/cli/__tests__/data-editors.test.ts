import { describe, expect, test } from "bun:test";

import { editors, getZedConfig } from "../src/data/editors";

describe("getZedConfig", () => {
  test.each(["biome", "eslint", "oxlint"] as const)(
    "sets TypeScript preferences on vtsls, Zed's default server (%s)",
    (linter) => {
      const { lsp } = getZedConfig(linter);

      expect(lsp).not.toHaveProperty("typescript-language-server");
      expect(lsp.vtsls.settings).toEqual({
        javascript: { preferences: { includePackageJsonAutoImports: "on" } },
        typescript: { preferences: { includePackageJsonAutoImports: "on" } },
      });
    }
  );

  // ESLint no longer runs Prettier as a rule, so ESLint's language server
  // can't format; Zed's Prettier integration formats after ESLint's fixes.
  test.each(["JavaScript", "TSX", "TypeScript"] as const)(
    "formats %s with Prettier after ESLint's fixes on ESLint",
    (language) => {
      expect(getZedConfig("eslint")).toHaveProperty(["languages", language], {
        code_actions_on_format: {
          "source.fixAll.eslint": true,
          "source.organizeImports.eslint": true,
        },
        formatter: "prettier",
      });
    }
  );
});

describe("VS Code settings", () => {
  // VS Code 1.111 renamed typescript.tsdk to js/ts.tsdk.path and deprecated
  // the old name; editors built on an earlier VS Code only read the old one.
  test("add the pre-1.111 TypeScript settings only for editors built on an older VS Code", () => {
    const withLegacy = editors
      .filter(
        (editor) => "typescript.tsdk" in editor.config.getContent("oxlint")
      )
      .map((editor) => editor.id)
      .toSorted();

    expect(withLegacy).toEqual(["antigravity", "codebuddy", "trae", "void"]);
    for (const editor of editors.filter((e) => e.config.extensionClis)) {
      expect(editor.config.getContent("oxlint")).toHaveProperty(
        ["js/ts.tsdk.path"],
        "node_modules/typescript/lib"
      );
    }
  });
});

describe("Zed's Oxc settings", () => {
  // The Oxc extension provides `source.fixAll.oxc` and quick fixes, not an
  // import-sorting action; Oxfmt sorts imports when it formats.
  test("only ask for the code actions the Oxc extension provides", () => {
    expect(getZedConfig("oxlint")).toHaveProperty(
      ["languages", "TypeScript", "code_actions_on_format"],
      { "source.fixAll.oxc": true }
    );
  });
});
