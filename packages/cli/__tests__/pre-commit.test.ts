import { beforeEach, describe, expect, mock, test } from "bun:test";
import { preCommit } from "../src/integrations/pre-commit";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("nypm", () => ({
  dlxCommand: mock(() => "npx ultracite fix"),
  detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
}));

describe("pre-commit", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when .pre-commit-config.yaml exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await preCommit.exists();
      expect(result).toBe(true);
    });

    test("returns false when .pre-commit-config.yaml does not exist", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await preCommit.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates .pre-commit-config.yaml with correct content", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      await preCommit.create("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.pre-commit-config.yaml");
      expect(writeCall[1]).toContain("repos:");
      expect(writeCall[1]).toContain("repo: local");
      expect(writeCall[1]).toContain("id: ultracite");
      expect(writeCall[1]).toContain("npx ultracite fix");
      expect(writeCall[1]).toContain("language: system");
    });
  });

  describe("update", () => {
    test("skips update if ultracite hook already exists", async () => {
      const existingContent = `repos:
  - repo: local
    hooks:
      - id: ultracite
        name: ultracite
        entry: npx ultracite fix
        language: system
`;
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      await preCommit.update("npm");

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("adds ultracite hook to existing repos section", async () => {
      const existingContent = `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.0.0
    hooks:
      - id: trailing-whitespace
`;
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      await preCommit.update("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("id: ultracite");
      expect(writeCall[1]).toContain("trailing-whitespace");
    });

    test("creates repos section if not present", async () => {
      const existingContent = "# pre-commit configuration\n";
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      await preCommit.update("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("repos:");
      expect(writeCall[1]).toContain("id: ultracite");
    });
  });
});
