import { readFile, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { biome } from "../src/biome";
import { exists } from "../src/utils";

vi.mock("node:fs/promises");
vi.mock("../src/utils", () => ({
  exists: vi.fn(),
}));

describe("biome configuration", () => {
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exists", () => {
    it("should return true when biome.json exists", async () => {
      vi.mocked(exists).mockImplementation(
        async (path: Parameters<typeof exists>[0]) => {
          if (path === "./biome.json") {
            return await Promise.resolve(true);
          }
          return await Promise.resolve(false);
        }
      );

      const result = await biome.exists();

      expect(result).toBe(true);
    });

    it("should return true when biome.jsonc exists and biome.json does not", async () => {
      vi.mocked(exists).mockImplementation(
        async (path: Parameters<typeof exists>[0]) => {
          if (path === "./biome.json") {
            return await Promise.resolve(false);
          }
          if (path === "./biome.jsonc") {
            return await Promise.resolve(true);
          }
          return await Promise.resolve(false);
        }
      );

      const result = await biome.exists();

      expect(result).toBe(true);
    });

    it("should return false when neither biome.json nor biome.jsonc exists", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const result = await biome.exists();

      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    it("should create biome.jsonc with default configuration when neither file exists", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      await biome.create();

      const expectedConfig = {
        $schema: "./node_modules/@biomejs/biome/configuration_schema.json",
        extends: ["ultracite/core"],
      };

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        JSON.stringify(expectedConfig, null, 2)
      );
    });

    it("should create biome.json with default configuration when biome.json exists", async () => {
      vi.mocked(exists).mockImplementation(
        async (path: Parameters<typeof exists>[0]) => {
          if (path === "./biome.json") {
            return await Promise.resolve(true);
          }
          return await Promise.resolve(false);
        }
      );

      await biome.create();

      const expectedConfig = {
        $schema: "./node_modules/@biomejs/biome/configuration_schema.json",
        extends: ["ultracite/core"],
      };

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.json",
        JSON.stringify(expectedConfig, null, 2)
      );
    });

    it("should create biome.jsonc with framework-specific extends when frameworks are provided", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      await biome.create({ frameworks: ["react", "next"] });

      const expectedConfig = {
        $schema: "./node_modules/@biomejs/biome/configuration_schema.json",
        extends: ["ultracite/core", "ultracite/react", "ultracite/next"],
      };

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        JSON.stringify(expectedConfig, null, 2)
      );
    });

    it("should handle empty frameworks array", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      await biome.create({ frameworks: [] });

      const expectedConfig = {
        $schema: "./node_modules/@biomejs/biome/configuration_schema.json",
        extends: ["ultracite/core"],
      };

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        JSON.stringify(expectedConfig, null, 2)
      );
    });
  });

  describe("update", () => {
    it("should merge existing configuration with default configuration for biome.jsonc", async () => {
      vi.mocked(exists).mockImplementation(
        async (path: Parameters<typeof exists>[0]) => {
          if (path === "./biome.json") {
            return await Promise.resolve(false);
          }
          if (path === "./biome.jsonc") {
            return await Promise.resolve(true);
          }
          return await Promise.resolve(false);
        }
      );

      const existingConfig = {
        customProperty: "value",
        extends: ["other-config"],
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await biome.update();

      expect(mockReadFile).toHaveBeenCalledWith("./biome.jsonc", "utf-8");

      // Verify that writeFile was called with merged configuration
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        expect.stringContaining('"customProperty": "value"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        expect.stringContaining(
          `"$schema": "./node_modules/@biomejs/biome/configuration_schema.json"`
        )
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        expect.stringContaining(
          '"extends": [\n    "other-config",\n    "ultracite/core"\n  ]'
        )
      );
    });

    it("should merge existing configuration with default configuration for biome.json", async () => {
      vi.mocked(exists).mockImplementation(
        async (path: Parameters<typeof exists>[0]) => {
          if (path === "./biome.json") {
            return await Promise.resolve(true);
          }
          return await Promise.resolve(false);
        }
      );

      const existingConfig = {
        customProperty: "value",
        extends: ["other-config"],
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await biome.update();

      expect(mockReadFile).toHaveBeenCalledWith("./biome.json", "utf-8");

      // Verify that writeFile was called with merged configuration
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.json",
        expect.stringContaining('"customProperty": "value"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.json",
        expect.stringContaining(
          `"$schema": "./node_modules/@biomejs/biome/configuration_schema.json"`
        )
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.json",
        expect.stringContaining(
          '"extends": [\n    "other-config",\n    "ultracite/core"\n  ]'
        )
      );
    });

    it("should handle JSON parsing errors gracefully", async () => {
      vi.mocked(exists).mockResolvedValue(false); // Neither file exists, defaults to biome.jsonc

      mockReadFile.mockResolvedValue("invalid json");

      // Should not throw, but handle gracefully by treating as empty config
      await expect(biome.update()).resolves.not.toThrow();
      expect(mockReadFile).toHaveBeenCalledWith("./biome.jsonc", "utf-8");

      // Should write the default config when parsing fails
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        expect.stringContaining('"extends": [\n    "ultracite/core"\n  ]')
      );
    });

    it("should handle JSONC files with comments", async () => {
      vi.mocked(exists).mockImplementation(
        async (path: Parameters<typeof exists>[0]) => {
          if (path === "./biome.json") {
            return await Promise.resolve(false);
          }

          if (path === "./biome.jsonc") {
            return await Promise.resolve(true);
          }

          return await Promise.resolve(false);
        }
      );

      const existingConfigWithComments = `{
  // Biome configuration with comments
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  
  /* Custom property */
  "customProperty": "value",
  
  // Existing extends array
  "extends": ["other-config"]
}`;

      mockReadFile.mockResolvedValue(existingConfigWithComments);

      await biome.update();

      expect(mockReadFile).toHaveBeenCalledWith("./biome.jsonc", "utf-8");

      // Verify that the JSONC content was properly parsed and merged
      // Note: Comments are not preserved in the output (limitation of JSON.stringify)
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        expect.stringContaining('"customProperty": "value"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        expect.stringContaining(
          `"$schema": "./node_modules/@biomejs/biome/configuration_schema.json"`
        )
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        expect.stringContaining(
          '"extends": [\n    "other-config",\n    "ultracite/core"\n  ]'
        )
      );
    });

    it("should add framework-specific extends when frameworks are provided in update", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const existingConfig = {
        extends: ["other-config"],
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await biome.update({ frameworks: ["react", "vue"] });

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        expect.stringContaining(
          '"extends": [\n    "other-config",\n    "ultracite/core",\n    "ultracite/react",\n    "ultracite/vue"\n  ]'
        )
      );
    });

    it("should not duplicate framework extends if they already exist", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const existingConfig = {
        extends: ["ultracite/core", "ultracite/react"],
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await biome.update({ frameworks: ["react", "next"] });

      // Should only add next, not duplicate react
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        expect.stringContaining("ultracite/next")
      );
      // Should not have duplicate react entries
      const writeCall = mockWriteFile.mock.calls[0]?.[1] as string;
      const matches = writeCall.match(/ultracite\/react/g);
      expect(matches).toHaveLength(1);
    });

    it("should handle empty frameworks array in update", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const existingConfig = {
        extends: ["other-config"],
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await biome.update({ frameworks: [] });

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./biome.jsonc",
        expect.stringContaining(
          '"extends": [\n    "other-config",\n    "ultracite/core"\n  ]'
        )
      );
    });
  });
});
