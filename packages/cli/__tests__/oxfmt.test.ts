import { beforeEach, describe, expect, mock, test } from "bun:test";

import { oxfmt } from "../src/linters/oxfmt";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("oxfmt", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when oxfmt.config.ts exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxfmt.config.ts") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await oxfmt.exists();
      expect(result).toBe(true);
    });

    test("returns false when no oxfmt config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await oxfmt.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates oxfmt config that imports from ultracite/oxfmt", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxfmt.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = writeCall[1] as string;

      expect(writtenContent).toContain('import { defineConfig } from "oxfmt"');
      expect(writtenContent).toContain(
        'import ultracite from "ultracite/oxfmt"'
      );
      expect(writtenContent).toContain("defineConfig");
    });
  });

  describe("update", () => {
    test("writes config that imports from ultracite/oxfmt", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxfmt.config.ts") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await oxfmt.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = writeCall[1] as string;

      expect(writtenContent).toContain('import { defineConfig } from "oxfmt"');
      expect(writtenContent).toContain(
        'import ultracite from "ultracite/oxfmt"'
      );
      expect(writtenContent).toContain("defineConfig");
    });
  });
});
