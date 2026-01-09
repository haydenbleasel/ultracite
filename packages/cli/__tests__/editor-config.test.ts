import { describe, expect, mock, test } from "bun:test";

import { createEditorConfig } from "../src/editor-config";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  mkdir: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("node:child_process", () => ({
  spawnSync: mock(() => ({ status: 0 })),
}));

describe("createEditorConfig", () => {
  describe("invalid editor", () => {
    test("throws error for invalid editor id", () => {
      expect(() => {
        // @ts-expect-error - Testing invalid editor id
        createEditorConfig("invalid-editor-id");
      }).toThrow('Editor "invalid-editor-id" not found');
    });
  });

  describe("update", () => {
    test("creates file when it does not exist", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      const editorConfig = createEditorConfig("vscode");
      await editorConfig.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe(".vscode/settings.json");
    });

    test("merges with existing config when file exists", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"editor.tabSize": 4}')),
        writeFile: mockWriteFile,
      }));

      const editorConfig = createEditorConfig("vscode");
      await editorConfig.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent["editor.tabSize"]).toBe(4);
    });
  });

  describe("linter configurations", () => {
    test("creates vscode config with eslint linter", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      const editorConfig = createEditorConfig("vscode", "eslint");
      await editorConfig.create();

      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("creates vscode config with oxlint linter", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      const editorConfig = createEditorConfig("vscode", "oxlint");
      await editorConfig.create();

      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("creates zed config with eslint linter", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      const editorConfig = createEditorConfig("zed", "eslint");
      await editorConfig.create();

      expect(mockWriteFile).toHaveBeenCalled();
    });

    test("creates zed config with oxlint linter", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      const editorConfig = createEditorConfig("zed", "oxlint");
      await editorConfig.create();

      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe("windsurf hooks", () => {
    test("creates windsurf hooks config", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      // @ts-expect-error - Testing windsurf hooks if editor supports it
      const hooks = await import("../src/hooks").then((m) =>
        m.createHooks("windsurf", "npm")
      );
      await hooks.create();

      expect(mockWriteFile).toHaveBeenCalled();
    });
  });
});
