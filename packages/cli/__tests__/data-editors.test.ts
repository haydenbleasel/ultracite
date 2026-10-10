import { describe, expect, test } from "bun:test";

import { getZedConfig } from "../src/data/editors";

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
