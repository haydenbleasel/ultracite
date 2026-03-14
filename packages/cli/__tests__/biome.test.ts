import { beforeEach, describe, expect, mock, test } from "bun:test";

import { biome } from "../src/linters/biome";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("biome", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when biome.json exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await biome.exists();
      expect(result).toBe(true);
    });

    test("returns true when biome.jsonc exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await biome.exists();
      expect(result).toBe(true);
    });

    test("returns false when no biome config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await biome.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates biome config with default extends", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await biome.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.extends).toEqual(["ultracite/biome/core"]);
      expect(writtenContent.$schema).toBe(
        "./node_modules/@biomejs/biome/configuration_schema.json"
      );
    });

    test("creates biome config with framework extends", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await biome.create({ frameworks: ["react", "next"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.extends).toEqual([
        "ultracite/biome/core",
        "ultracite/biome/react",
        "ultracite/biome/next",
      ]);
    });
  });

  describe("update", () => {
    test("adds ultracite/biome/core to existing config", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve('{"formatter": {"indentStyle": "tab"}}')
        ),
        writeFile: mockWriteFile,
      }));

      await biome.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.extends).toContain("ultracite/biome/core");
      expect(writtenContent.formatter.indentStyle).toBe("tab");
    });

    test("does not duplicate ultracite/biome/core in extends", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve('{"extends": ["ultracite/biome/core"]}')
        ),
        writeFile: mockWriteFile,
      }));

      await biome.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.extends).toEqual(["ultracite/biome/core"]);
    });

    test("adds framework extends without duplicates", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() =>
          Promise.resolve(
            '{"extends": ["ultracite/biome/core", "ultracite/biome/react"]}'
          )
        ),
        writeFile: mockWriteFile,
      }));

      await biome.update({ frameworks: ["react", "next"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.extends).toEqual([
        "ultracite/biome/core",
        "ultracite/biome/react",
        "ultracite/biome/next",
      ]);
    });

    test("handles invalid JSON gracefully", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./biome.jsonc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("invalid json")),
        writeFile: mockWriteFile,
      }));

      await biome.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.extends).toContain("ultracite/biome/core");
    });
  });
});
