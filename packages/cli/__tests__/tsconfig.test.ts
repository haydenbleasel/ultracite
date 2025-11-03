import { beforeEach, describe, expect, mock, test } from "bun:test";
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
  beforeEach(() => {
    mock.restore();
  });

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
  });

  describe("update", () => {
    test("adds strictNullChecks to tsconfig", async () => {
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

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.compilerOptions.strictNullChecks).toBe(true);
      expect(writtenContent.compilerOptions.strict).toBe(true);
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
