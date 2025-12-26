import { describe, expect, mock, test } from "bun:test";
import { eslint } from "../src/linters/eslint";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("eslint linter", () => {
  describe("exists", () => {
    test("returns true when eslint config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./eslint.config.mjs") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await eslint.exists();
      expect(result).toBe(true);
    });

    test("returns false when no eslint config exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await eslint.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates eslint config file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await eslint.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./eslint.config.mjs");
      expect(writeCall[1]).toContain("ultracite");
    });

    test("creates eslint config with frameworks", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await eslint.create({ frameworks: ["react", "next"] });

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("ultracite.react");
      expect(writeCall[1]).toContain("ultracite.next");
    });
  });

  describe("update", () => {
    test("updates eslint config file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await eslint.update();

      expect(mockWriteFile).toHaveBeenCalled();
    });
  });
});
