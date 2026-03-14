import { beforeEach, describe, expect, mock, test } from "bun:test";

import { createEditorConfig } from "../src/editor-config";

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

describe("vscode editor config", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when settings.json exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".vscode/settings.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const vscode = createEditorConfig("vscode");
      const result = await vscode.exists();
      expect(result).toBe(true);
    });

    test("returns false when settings.json does not exist", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const vscode = createEditorConfig("vscode");
      const result = await vscode.exists();
      expect(result).toBe(false);
    });
  });

  describe("create", () => {
    test("creates .vscode directory", async () => {
      const mockMkdir = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mockMkdir,
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const vscode = createEditorConfig("vscode");
      await vscode.create();

      expect(mockMkdir).toHaveBeenCalledWith(".vscode", { recursive: true });
    });

    test("creates settings.json with default config", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      const vscode = createEditorConfig("vscode");
      await vscode.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe(".vscode/settings.json");
      const writtenContent = JSON.parse(writeCall[1] as string);
      // The default config includes various VS Code settings
      // Just verify it's a valid object with some expected keys
      expect(typeof writtenContent).toBe("object");
      expect(Object.keys(writtenContent).length).toBeGreaterThan(0);
    });
  });

  describe("update", () => {
    test("merges with existing settings", async () => {
      const existingSettings = '{"editor.tabSize": 4}';
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingSettings)),
        writeFile: mockWriteFile,
      }));

      const vscode = createEditorConfig("vscode");
      await vscode.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      // Verify the existing setting is preserved
      expect(writtenContent["editor.tabSize"]).toBe(4);
      // Verify new settings are added
      expect(Object.keys(writtenContent).length).toBeGreaterThan(1);
    });

    test("handles invalid JSON gracefully", async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("invalid json")),
        writeFile: mockWriteFile,
      }));

      const vscode = createEditorConfig("vscode");
      await vscode.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      // Should still create valid config even with invalid input
      expect(typeof writtenContent).toBe("object");
      expect(Object.keys(writtenContent).length).toBeGreaterThan(0);
    });
  });

  describe("extension", () => {
    test("attempts to install Biome extension", () => {
      const mockSpawn = mock(() => ({ status: 0 }));
      mock.module("node:child_process", () => ({
        execSync: mock(() => ""),
        spawnSync: mockSpawn,
      }));

      const vscode = createEditorConfig("vscode");
      expect(vscode.extension).toBeDefined();
      vscode.extension?.("biomejs.biome");

      expect(mockSpawn).toHaveBeenCalled();
      const spawnCall = mockSpawn.mock.calls[0];
      expect(spawnCall[0]).toContain("code --install-extension biomejs.biome");
    });
  });
});
