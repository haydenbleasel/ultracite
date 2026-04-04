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
    test("creates prettier config with no frameworks (re-exports core)", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./prettier.config.mjs");
      expect(writeCall[1]).toContain("ultracite/prettier");
    });

    test("creates prettier config with svelte framework", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.create(["svelte"]);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("ultracite/prettier/svelte");
      expect(writeCall[1]).toContain("ultracite/prettier/core");
    });

    test("creates prettier config with astro framework", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.create(["astro"]);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("ultracite/prettier/astro");
    });

    test("creates prettier config with svelte and astro merging plugins", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.create(["svelte", "astro"]);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("ultracite/prettier/svelte");
      expect(writeCall[1]).toContain("ultracite/prettier/astro");
      // Should explicitly merge plugins for multi-framework
      expect(writeCall[1]).toContain("plugins:");
    });

    test("ignores non-prettier frameworks", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.create(["react", "next"]);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      // React/next have no prettier plugins, so falls back to core re-export
      expect(writeCall[1]).toContain("ultracite/prettier");
      expect(writeCall[1]).not.toContain("ultracite/prettier/react");
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

    test("updates prettier config with framework", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await prettier.update(["svelte"]);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("ultracite/prettier/svelte");
    });
  });
});

