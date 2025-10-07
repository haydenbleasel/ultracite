/** biome-ignore-all lint/style/useNamingConvention: "Zed config uses snake_case" */
import { readFile, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { zed } from "../src/editor-config/zed";
import { exists } from "../src/utils";

vi.mock("node:fs/promises");
vi.mock("../src/utils", () => ({
  exists: vi.fn(),
}));

describe("zed configuration", () => {
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exists", () => {
    it("should return true when .zed/settings.json exists", async () => {
      mockExists.mockResolvedValue(true);

      const result = await zed.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith("./.zed/settings.json");
    });

    it("should return false when .zed/settings.json does not exist", async () => {
      mockExists.mockResolvedValue(false);

      const result = await zed.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith("./.zed/settings.json");
    });
  });

  describe("create", () => {
    it("should create .zed/settings.json with default configuration", async () => {
      await zed.create();

      const expectedConfig = {
        formatter: "language_server",
        format_on_save: "on",
        languages: {
          JavaScript: {
            formatter: {
              language_server: {
                name: "biome",
              },
            },
            code_actions_on_format: {
              "source.fixAll.biome": true,
              "source.organizeImports.biome": true,
            },
          },
          TypeScript: {
            formatter: {
              language_server: {
                name: "biome",
              },
            },
            code_actions_on_format: {
              "source.fixAll.biome": true,
              "source.organizeImports.biome": true,
            },
          },
          JSX: {
            formatter: {
              language_server: {
                name: "biome",
              },
            },
            code_actions_on_format: {
              "source.fixAll.biome": true,
              "source.organizeImports.biome": true,
            },
          },
          TSX: {
            formatter: {
              language_server: {
                name: "biome",
              },
            },
            code_actions_on_format: {
              "source.fixAll.biome": true,
              "source.organizeImports.biome": true,
            },
          },
        },
        lsp: {
          "typescript-language-server": {
            settings: {
              typescript: {
                preferences: {
                  includePackageJsonAutoImports: "on",
                },
              },
            },
          },
        },
      };

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        JSON.stringify(expectedConfig, null, 2)
      );
    });
  });

  describe("update", () => {
    it("should merge existing configuration with default configuration", async () => {
      const existingConfig = {
        ui_font_size: 16,
        vim_mode: true,
        restore_on_startup: "none",
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await zed.update();

      expect(mockReadFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        "utf-8"
      );

      // Verify that writeFile was called with merged configuration
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        expect.stringContaining('"ui_font_size": 16')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        expect.stringContaining('"restore_on_startup": "none"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        expect.stringContaining('"vim_mode": true')
      );
    });

    it("should preserve existing biome configuration while adding missing parts", async () => {
      const existingConfig = {
        ui_font_size: 16,
        vim_mode: true,
        restore_on_startup: "none",
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await zed.update();

      // Should merge the nested configuration properly
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        expect.stringContaining('"formatter": "language_server"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        expect.stringContaining('"ui_font_size": 16')
      );
    });

    it("should handle invalid JSON by treating it as empty config", async () => {
      mockReadFile.mockResolvedValue("invalid json");

      await zed.update();

      expect(mockReadFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        "utf-8"
      );

      // When parsing fails, jsonc-parser returns undefined,
      // so deepmerge treats it as merging with undefined (effectively just using defaultConfig)
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        JSON.stringify(
          {
            formatter: "language_server",
            format_on_save: "on",
            languages: {
              JavaScript: {
                formatter: {
                  language_server: {
                    name: "biome",
                  },
                },
                code_actions_on_format: {
                  "source.fixAll.biome": true,
                  "source.organizeImports.biome": true,
                },
              },
              TypeScript: {
                formatter: {
                  language_server: {
                    name: "biome",
                  },
                },
                code_actions_on_format: {
                  "source.fixAll.biome": true,
                  "source.organizeImports.biome": true,
                },
              },
              JSX: {
                formatter: {
                  language_server: {
                    name: "biome",
                  },
                },
                code_actions_on_format: {
                  "source.fixAll.biome": true,
                  "source.organizeImports.biome": true,
                },
              },
              TSX: {
                formatter: {
                  language_server: {
                    name: "biome",
                  },
                },
                code_actions_on_format: {
                  "source.fixAll.biome": true,
                  "source.organizeImports.biome": true,
                },
              },
            },
            lsp: {
              "typescript-language-server": {
                settings: {
                  typescript: {
                    preferences: {
                      includePackageJsonAutoImports: "on",
                    },
                  },
                },
              },
            },
          },
          null,
          2
        )
      );
    });

    it("should handle .jsonc files with comments", async () => {
      const existingConfigWithComments = `{
        // UI Font Size
        "ui_font_size": 16,

        /* Vim mode */
        "vim_mode": true,

        // Restore on startup option
        "restore_on_startup": "none",
      }`;

      mockReadFile.mockResolvedValue(existingConfigWithComments);

      await zed.update();

      expect(mockReadFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        "utf-8"
      );

      // Verify that the JSONC content was properly parsed and merged
      // Note: Comments are not preserved in the output (limitation of JSON.stringify)
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        expect.stringContaining('"ui_font_size": 16')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        expect.stringContaining('"restore_on_startup": "none"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        expect.stringContaining('"formatter": "language_server"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.zed/settings.json",
        expect.stringContaining('"vim_mode": true')
      );
    });
  });
});
