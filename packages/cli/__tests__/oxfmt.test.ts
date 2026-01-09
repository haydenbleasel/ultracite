import { beforeEach, describe, expect, mock, test } from "bun:test";

import { oxfmt } from "../src/linters/oxfmt";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("oxfmt", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when .oxfmtrc.jsonc exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.oxfmtrc.jsonc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await oxfmt.exists();
      expect(result).toBe(true);
    });

    test("returns false when no oxfmt config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await oxfmt.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates oxfmt config with default settings", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await oxfmt.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = writeCall[1] as string;

      // Verify the content contains the expected header
      expect(writtenContent).toContain("// Ultracite oxfmt Configuration");

      // Parse the JSON part (after the comments)
      const jsonPart = writtenContent
        .split("\n")
        .filter((line: string) => !line.startsWith("//"))
        .join("\n");
      const config = JSON.parse(jsonPart);

      expect(config.$schema).toBe(
        "./node_modules/oxfmt/configuration_schema.json"
      );
      expect(config.printWidth).toBe(80);
      expect(config.tabWidth).toBe(2);
      expect(config.useTabs).toBe(false);
      expect(config.semi).toBe(true);
      expect(config.singleQuote).toBe(false);
      expect(config.endOfLine).toBe("lf");
    });
  });

  describe("update", () => {
    test("merges existing config with defaults", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.oxfmtrc.jsonc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve('{"printWidth": 100, "customOption": true}')
        ),
        writeFile: mockWriteFile,
      }));

      await oxfmt.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = writeCall[1] as string;

      // Parse the JSON part (after the comments)
      const jsonPart = writtenContent
        .split("\n")
        .filter((line: string) => !line.startsWith("//"))
        .join("\n");
      const config = JSON.parse(jsonPart);

      // Default values should override existing
      expect(config.printWidth).toBe(80);
      expect(config.tabWidth).toBe(2);
      // Custom options should be preserved
      expect(config.customOption).toBe(true);
    });

    test("handles invalid JSON gracefully", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.oxfmtrc.jsonc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("invalid json")),
        writeFile: mockWriteFile,
      }));

      await oxfmt.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = writeCall[1] as string;

      // Parse the JSON part (after the comments)
      const jsonPart = writtenContent
        .split("\n")
        .filter((line: string) => !line.startsWith("//"))
        .join("\n");
      const config = JSON.parse(jsonPart);

      // Should still have default values
      expect(config.printWidth).toBe(80);
      expect(config.tabWidth).toBe(2);
    });
  });
});
