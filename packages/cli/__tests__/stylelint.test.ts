import { describe, expect, mock, test } from "bun:test";

import { stylelint } from "../src/linters/stylelint";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("stylelint linter", () => {
  describe("exists", () => {
    test("returns true when stylelint key in package.json", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"stylelint": {}}')),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await stylelint.exists();
      expect(result).toBe(true);
    });

    test("returns true when stylelint config file exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.stylelintrc.mjs") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await stylelint.exists();
      expect(result).toBe(true);
    });

    test("returns false when no stylelint config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await stylelint.exists();
      expect(result).toBe(false);
    });

    test("returns false when package.json read fails", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.reject(new Error("Read error"))),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await stylelint.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates stylelint config file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await stylelint.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./stylelint.config.mjs");
      expect(writeCall[1]).toContain("ultracite/stylelint");
    });
  });

  describe("update", () => {
    test("updates stylelint config file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await stylelint.update();

      expect(mockWriteFile).toHaveBeenCalled();
    });
  });
});
