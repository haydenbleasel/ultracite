import { beforeEach, describe, expect, mock, test } from "bun:test";

import { husky } from "../src/integrations/husky";

mock.module("node:child_process", () => ({
  execSync: mock(() => ""),
  spawnSync: mock(() => ({ status: 0 })),
}));

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  mkdir: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("nypm", () => ({
  addDevDependency: mock(() => Promise.resolve()),
  detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
  dlxCommand: mock(() => "npx ultracite fix"),
  removeDependency: mock(() => Promise.resolve()),
}));

describe("husky", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when pre-commit hook exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await husky.exists();
      expect(result).toBe(true);
    });

    test("returns false when pre-commit hook does not exist", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await husky.exists();
      expect(result).toBe(false);
    });
  });

  describe("install", () => {
    test("installs husky dependency", async () => {
      const mockAddDep = mock(() => Promise.resolve());
      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.install("npm");

      expect(mockAddDep).toHaveBeenCalledWith("husky", expect.any(Object));
    });

    test("adds prepare script to package.json", async () => {
      const mockReadFile = mock(() => Promise.resolve('{"name": "test"}'));
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mockReadFile,
        writeFile: mockWriteFile,
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.install("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.scripts?.prepare).toBe("husky");
    });
  });

  describe("create", () => {
    test("creates .husky directory", async () => {
      const mockMkdir = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mockMkdir,
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      await husky.create("npm");

      expect(mockMkdir).toHaveBeenCalledWith(".husky", { recursive: true });
    });

    test("creates pre-commit hook with correct content", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await husky.create("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.husky/pre-commit");
      expect(writeCall[1]).toContain("#!/bin/sh");
      expect(writeCall[1]).toContain("npx ultracite fix");
    });
  });

  describe("update", () => {
    test("appends to existing pre-commit hook", async () => {
      const existingContent = '#!/bin/sh\necho "existing"';
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      await husky.update("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("existing");
      expect(writeCall[1]).toContain("npx ultracite fix");
    });
  });
});
