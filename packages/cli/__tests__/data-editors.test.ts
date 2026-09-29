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
});
