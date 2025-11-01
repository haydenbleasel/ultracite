import { readFile, writeFile } from "node:fs/promises";
import { glob } from "glob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tsconfig } from "../src/tsconfig";

vi.mock("node:fs/promises");
vi.mock("glob");

describe("tsconfig configuration", () => {
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockGlob = vi.mocked(glob);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exists", () => {
    it("should return true when tsconfig.json files exist", async () => {
      mockGlob.mockResolvedValue([
        "tsconfig.json",
        "packages/app/tsconfig.json",
      ]);

      const result = await tsconfig.exists();

      expect(result).toBe(true);
      expect(mockGlob).toHaveBeenCalledWith("**/tsconfig*.json", {
        ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.next/**"],
        absolute: false,
      });
    });

    it("should return false when no tsconfig.json files exist", async () => {
      mockGlob.mockResolvedValue([]);

      const result = await tsconfig.exists();

      expect(result).toBe(false);
    });

    it("should handle glob errors gracefully", async () => {
      mockGlob.mockRejectedValue(new Error("glob error"));

      const result = await tsconfig.exists();

      expect(result).toBe(false);
    });
  });

  describe("update", () => {
    it("should update all found tsconfig.json files", async () => {
      const files = ["tsconfig.json", "packages/app/tsconfig.json"];
      mockGlob.mockResolvedValue(files);

      const existingConfig1 = {
        compilerOptions: {
          target: "ES2020",
        },
      };
      const existingConfig2 = {
        compilerOptions: {
          module: "commonjs",
        },
      };

      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(existingConfig1))
        .mockResolvedValueOnce(JSON.stringify(existingConfig2));

      await tsconfig.update();

      expect(mockGlob).toHaveBeenCalledWith("**/tsconfig*.json", {
        ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.next/**"],
        absolute: false,
      });

      expect(mockReadFile).toHaveBeenCalledTimes(2);
      expect(mockReadFile).toHaveBeenCalledWith("tsconfig.json", "utf-8");
      expect(mockReadFile).toHaveBeenCalledWith("packages/app/tsconfig.json", "utf-8");

      expect(mockWriteFile).toHaveBeenCalledTimes(2);
      expect(mockWriteFile).toHaveBeenCalledWith(
        "tsconfig.json",
        expect.stringContaining('"strictNullChecks": true')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "packages/app/tsconfig.json",
        expect.stringContaining('"strictNullChecks": true')
      );
    });

    it("should merge existing configuration with strictNullChecks", async () => {
      mockGlob.mockResolvedValue(["tsconfig.json"]);

      const existingConfig = {
        compilerOptions: {
          target: "ES2020",
          module: "commonjs",
        },
        include: ["src/**/*"],
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await tsconfig.update();

      expect(mockWriteFile).toHaveBeenCalledWith(
        "tsconfig.json",
        expect.stringContaining('"target": "ES2020"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "tsconfig.json",
        expect.stringContaining('"strictNullChecks": true')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "tsconfig.json",
        expect.stringContaining('"include"')
      );
    });

    it("should handle configuration without compilerOptions", async () => {
      mockGlob.mockResolvedValue(["tsconfig.json"]);

      const existingConfig = {
        include: ["src/**/*"],
        exclude: ["node_modules"],
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await tsconfig.update();

      expect(mockWriteFile).toHaveBeenCalledWith(
        "tsconfig.json",
        expect.stringContaining('"strictNullChecks": true')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "tsconfig.json",
        expect.stringContaining('"include"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "tsconfig.json",
        expect.stringContaining('"exclude"')
      );
    });

    it("should handle JSON parsing errors gracefully", async () => {
      mockGlob.mockResolvedValue(["tsconfig.json"]);
      mockReadFile.mockResolvedValue("invalid json");

      await expect(tsconfig.update()).resolves.not.toThrow();

      expect(mockWriteFile).toHaveBeenCalledWith(
        "tsconfig.json",
        expect.stringContaining('"strictNullChecks": true')
      );
    });

    it("should handle JSONC files with comments", async () => {
      mockGlob.mockResolvedValue(["tsconfig.json"]);

      const existingConfigWithComments = `{
  // TypeScript configuration with comments
  "compilerOptions": {
    /* Existing compiler options */
    "target": "ES2020",
    "module": "commonjs"
  },

  // Include and exclude patterns
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}`;

      mockReadFile.mockResolvedValue(existingConfigWithComments);

      await tsconfig.update();

      expect(mockWriteFile).toHaveBeenCalledWith(
        "tsconfig.json",
        expect.stringContaining('"target": "ES2020"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "tsconfig.json",
        expect.stringContaining('"strictNullChecks": true')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        "tsconfig.json",
        expect.stringContaining('"include"')
      );
    });

    it("should warn when no tsconfig.json files found", async () => {
      mockGlob.mockResolvedValue([]);
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await tsconfig.update();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "No tsconfig.json files found in the project"
      );
      expect(mockWriteFile).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("should continue updating other files if one fails", async () => {
      mockGlob.mockResolvedValue(["tsconfig.json", "packages/app/tsconfig.json"]);

      mockReadFile
        .mockRejectedValueOnce(new Error("read error"))
        .mockResolvedValueOnce(JSON.stringify({ compilerOptions: {} }));

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await tsconfig.update();

      expect(mockReadFile).toHaveBeenCalledTimes(2);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to update tsconfig.json"),
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
