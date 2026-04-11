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
    test("creates oxfmt config with default settings", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
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
      expect(writtenContent).toContain("defineConfig(");
      expect(writtenContent).toContain('"printWidth": 80');
      expect(writtenContent).toContain('"tabWidth": 2');
      expect(writtenContent).toContain('"useTabs": false');
      expect(writtenContent).toContain('"semi": true');
      expect(writtenContent).toContain('"singleQuote": false');
      expect(writtenContent).toContain('"endOfLine": "lf"');
    });
  });

  describe("update", () => {
    test("merges existing config with defaults", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      const existingConfig = `import { defineConfig } from "oxfmt";

export default defineConfig({
  "printWidth": 100,
  "customOption": true
});
`;

      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxfmt.config.ts") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      await oxfmt.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = writeCall[1] as string;

      // Default values should override existing
      expect(writtenContent).toContain('"printWidth": 80');
      expect(writtenContent).toContain('"tabWidth": 2');
      // Custom options should be preserved
      expect(writtenContent).toContain('"customOption": true');
    });

    test("handles invalid config gracefully", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./oxfmt.config.ts") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("invalid content")),
        writeFile: mockWriteFile,
      }));

      await oxfmt.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = writeCall[1] as string;

      // Should still have default values
      expect(writtenContent).toContain('"printWidth": 80');
      expect(writtenContent).toContain('"tabWidth": 2');
    });
  });
});
