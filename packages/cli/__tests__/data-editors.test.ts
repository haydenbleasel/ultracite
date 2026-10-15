import { describe, expect, test } from "bun:test";

import { editors, getZedConfig } from "../src/data/editors";

describe("getZedConfig", () => {
  test.each(["biome", "bun", "eslint", "oxlint"] as const)(
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

// Bun has no language server, so editors lint and format a Bun project with
// the oxc extension, on the same configs.
describe("editor settings for Bun", () => {
  test("are the Oxlint provider's", () => {
    expect(getZedConfig("bun")).toEqual(getZedConfig("oxlint"));

    for (const editor of editors) {
      expect(editor.config.getContent("bun")).toEqual(
        editor.config.getContent("oxlint")
      );
    }
  });
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

  // Unset, Oxlint's language server reads `options.typeAware` from the
  // Oxlint config, which init only sets with oxlint-tsgolint installed.
  test("leave type-aware linting to the Oxlint config", () => {
    expect(getZedConfig("oxlint")).toHaveProperty(
      ["lsp", "oxlint", "initialization_options", "settings", "typeAware"],
      null
    );
  });
});
