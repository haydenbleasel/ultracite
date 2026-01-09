import { describe, expect, mock, test } from "bun:test";

import { prettier } from "../src/linters/prettier";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("prettier linter", () => {
  describe("exists", () => {
    test("returns true when prettier key in package.json", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"prettier": {"semi": true}}')),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await prettier.exists();
      expect(result).toBe(true);
    });

    test("returns true when prettier config file exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.prettierrc.mjs") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await prettier.exists();
      expect(result).toBe(true);
    });

    test("returns false when no prettier config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await prettier.exists();
      expect(result).toBe(false);
    });

    test("returns false when package.json read fails", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.reject(new Error("Read error"))),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await prettier.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates prettier config file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./prettier.config.mjs");
      expect(writeCall[1]).toContain("ultracite/prettier");
    });
  });

  describe("update", () => {
    test("updates prettier config file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.update();

      expect(mockWriteFile).toHaveBeenCalled();
    });
  });
});
