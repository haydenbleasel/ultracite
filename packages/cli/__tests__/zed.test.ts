import { beforeEach, describe, expect, mock, test } from "bun:test";
import { zed } from "../src/editor-config/zed";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
  mkdir: mock(() => Promise.resolve()),
}));

describe("zed", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when settings.json exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.zed/settings.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
      }));

      const result = await zed.exists();
      expect(result).toBe(true);
    });

    test("returns false when settings.json does not exist", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
      }));

      const result = await zed.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates .zed directory", async () => {
      const mockMkdir = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mockMkdir,
      }));

      await zed.create();

      expect(mockMkdir).toHaveBeenCalledWith(".zed", { recursive: true });
    });

    test("creates settings.json with default config", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      await zed.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.zed/settings.json");
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent).toBeTruthy();
    });
  });

  describe("update", () => {
    test("merges with existing settings", async () => {
      const existingSettings = '{"theme": "dark"}';
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingSettings)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      await zed.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.theme).toBe("dark");
    });

    test("handles invalid JSON gracefully", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("invalid json")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      await zed.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent).toBeTruthy();
    });
  });
});
