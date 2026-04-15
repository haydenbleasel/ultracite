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
        createEditorConfig("invalid-editor-id");
      }).toThrow('Editor "invalid-editor-id" not found');
    });
  });

  describe("update", () => {
    test("creates file when it does not exist", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        mkdirSync: mock(() => {}),
        readFileSync: mock(() => "{}"),
      }));

      const editorConfig = createEditorConfig("vscode");
      await editorConfig.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe(".vscode/settings.json");
      // Should write default content, not merged content
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent).toBeDefined();
    });

    test("merges with existing config when file exists", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"editor.tabSize": 4}')),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const editorConfig = createEditorConfig("vscode");
      await editorConfig.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent["editor.tabSize"]).toBe(4);
    });
  });

  describe("linter configurations", () => {
    test("creates vscode config with eslint linter", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

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
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

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
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

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
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

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

    test("creates codebuddy config with biome linter", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      const editorConfig = createEditorConfig("codebuddy", "biome");
      await editorConfig.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe(".vscode/settings.json");
    });
  });

  describe("windsurf hooks", () => {
    test("creates windsurf hooks config", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      const m = await import("../src/hooks");
      const hooks = m.createHooks("windsurf", "npm");
      await hooks.create();

      expect(mockWriteFile).toHaveBeenCalled();
    });
  });
});
