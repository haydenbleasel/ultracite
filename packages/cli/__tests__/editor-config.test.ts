import { describe, expect, mock, test } from "bun:test";

import { createEditorConfig } from "../src/editor-config";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  mkdir: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
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
      const writtenContent = JSON.parse(writeCall[1]);
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
      const writtenContent = JSON.parse(writeCall[1]);
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

// A settings file at .vscode/settings.json with the given contents. Returns
// the mocks that record writes, warnings and directory creation.
const mockSettingsFile = (
  contents: string,
  { realParent = (filePath: string) => filePath } = {}
) => {
  const writeFile = mock((_path: string, _content: string) =>
    Promise.resolve()
  );
  const mkdirSync = mock(() => {});
  const warn = mock((_message: string) => {});

  mock.module("node:fs/promises", () => ({
    readFile: mock(() => Promise.resolve(contents)),
    writeFile,
  }));
  mock.module("node:fs", () => ({
    accessSync: mock(() => {}),
    existsSync: mock(() => true),
    lstatSync: mock(() => ({ isSymbolicLink: () => false })),
    mkdirSync,
    readFileSync: mock(() => "{}"),
    realpathSync: mock(realParent),
  }));
  mock.module("@clack/prompts", () => ({
    log: { error: mock(), info: mock(), success: mock(), warn },
  }));

  return { mkdirSync, warn, writeFile };
};

describe("updating existing settings", () => {
  test("keeps comments, formatting and unrelated settings", async () => {
    const settings = mockSettingsFile(`{
    // Team settings
    "editor.tabSize": 4,
    "editor.codeActionsOnSave": {
        "source.addMissingImports": "explicit" // keep
    },
}
`);

    await createEditorConfig("vscode", "oxlint").update();

    const [[, written]] = settings.writeFile.mock.calls;
    expect(written).toContain("// Team settings");
    expect(written).toContain('"source.addMissingImports": "explicit"');
    expect(written).toContain("// keep");
    expect(written).toContain('    "editor.tabSize": 4');
    expect(written).toContain('"source.fixAll.oxc": "explicit"');
    expect(written).toContain('"editor.formatOnSave": true');
  });

  test("leaves a settings file with a syntax error unchanged", async () => {
    const settings = mockSettingsFile(
      '{ "editor.tabSize": 2, "files.exclude": { "**/.git": true }, "x": '
    );

    await createEditorConfig("vscode", "biome").update();

    expect(settings.writeFile).not.toHaveBeenCalled();
    expect(settings.warn).toHaveBeenCalled();
  });

  test("doesn't create directories through a path outside the project", async () => {
    const settings = mockSettingsFile("{}", {
      // .vscode is a symlink that resolves outside the project.
      realParent: (filePath: string) =>
        String(filePath).includes(".vscode") ? "/elsewhere/.vscode" : filePath,
    });

    await expect(createEditorConfig("vscode").create()).rejects.toThrow(
      "Refusing to write"
    );
    expect(settings.mkdirSync).not.toHaveBeenCalled();
  });
});
