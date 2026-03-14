import { describe, expect, mock, test } from "bun:test";

import { tsconfig } from "../src/tsconfig";

mock.module("glob", () => ({
  glob: mock(() => Promise.resolve([])),
}));

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

describe("tsconfig", () => {
  // Note: We don't call mock.restore() here because it causes issues
  // with module re-loading when the tests transition between each other

  describe("exists", () => {
    test("returns true when tsconfig files are found", async () => {
      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve(["tsconfig.json"])),
      }));

      const result = await tsconfig.exists();
      expect(result).toBe(true);
    });

    test("returns false when no tsconfig files are found", async () => {
      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve([])),
      }));

      const result = await tsconfig.exists();
      expect(result).toBe(false);
    });

    test("returns false when glob throws an error", async () => {
      mock.module("glob", () => ({
        glob: mock(() => Promise.reject(new Error("Glob error"))),
      }));

      const result = await tsconfig.exists();
      expect(result).toBe(false);
    });
  });

  describe("update", () => {
    test("skips modification when strict: true is already set", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve(["tsconfig.json"])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve('{"compilerOptions": {"strict": true}}')
        ),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      // Should not write because strict: true already enables strictNullChecks
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("skips modification when strictNullChecks: true is already set", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve(["tsconfig.json"])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve('{"compilerOptions": {"strictNullChecks": true}}')
        ),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      // Should not write because strictNullChecks is already true
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("adds strictNullChecks when not present", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve(["tsconfig.json"])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() =>
          Promise.resolve('{"compilerOptions": {"target": "ES2020"}}')
        ),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.compilerOptions.strictNullChecks).toBe(true);
      expect(writtenContent.compilerOptions.target).toBe("ES2020");
    });

    test("preserves comments when modifying tsconfig", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const tsconfigWithComments = `{
  // This is a comment
  "compilerOptions": {
    "target": "ES2020"
  }
}`;
      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve(["tsconfig.json"])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(tsconfigWithComments)),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = writeCall[1] as string;
      // Comments should be preserved
      expect(writtenContent).toContain("// This is a comment");
    });

    test("updates multiple tsconfig files", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("glob", () => ({
        glob: mock(() =>
          Promise.resolve(["tsconfig.json", "tsconfig.base.json"])
        ),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      expect(mockWriteFile).toHaveBeenCalledTimes(2);
    });

    test("handles invalid JSON gracefully", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve(["tsconfig.json"])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("invalid json")),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.compilerOptions.strictNullChecks).toBe(true);
    });

    test("does nothing when no tsconfig files found", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("glob", () => ({
        glob: mock(() => Promise.resolve([])),
      }));
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await tsconfig.update();

      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
