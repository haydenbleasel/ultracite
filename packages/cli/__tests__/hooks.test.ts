import { describe, expect, mock, test } from "bun:test";

import { createHooks } from "../src/hooks";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  mkdir: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
}));

const npmBiomeCommand = "npm run fix -- --skip=correctness/noUnusedImports";

describe("createHooks", () => {
  // Note: We don't call mock.restore() here because it causes issues
  // with module re-loading when the tests transition between each other

  describe("invalid editor or hook integration", () => {
    test("throws error for invalid editor or hook integration name", () => {
      expect(() => {
        createHooks("invalid-editor-name", "npm");
      }).toThrow('Hook integration "invalid-editor-name" not found');
    });

    test("throws error for editor without hooks support", () => {
      expect(() => {
        createHooks("zed", "npm");
      }).toThrow('Hook integration "zed" not found');
    });
  });

  describe("cursor hooks", () => {
    test("exists returns true when hooks.json exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === ".cursor/hooks.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock((path: string) => {
          if (path === ".cursor/hooks.json") {
            return;
          }
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const hooks = createHooks("cursor", "npm");
      const result = await hooks.exists();
      expect(result).toBe(true);
    });

    test("create creates directory and hooks.json file", async () => {
      const mockMkdirSync = mock((_path: string) => {});
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        mkdirSync: mockMkdirSync,
        readFileSync: mock(() => "{}"),
      }));

      const hooks = createHooks("cursor", "npm");
      await hooks.create();

      expect(mockMkdirSync).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });

    test("create writes hooks.json with correct structure", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const hooks = createHooks("cursor", "npm");
      await hooks.create();

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe(".cursor/hooks.json");
      const content = JSON.parse(writeCall[1] as string);
      expect(content.version).toBe(1);
      expect(content.hooks.afterFileEdit).toHaveLength(1);
      expect(content.hooks.afterFileEdit[0].command).toBe(npmBiomeCommand);
    });

    test("update creates hooks.json if it doesn't exist", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const hooks = createHooks("cursor", "npm");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe(".cursor/hooks.json");
    });

    test("update adds ultracite hook when not present in hooks.json", async () => {
      const existingHooks =
        '{"version": 1, "hooks": {"afterFileEdit": [{"command": "echo test"}]}}';
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingHooks)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const hooks = createHooks("cursor", "npm");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [hooksWrite] = mockWriteFile.mock.calls;
      expect(hooksWrite[0]).toBe(".cursor/hooks.json");
      const hooksContent = JSON.parse(hooksWrite[1] as string);
      expect(hooksContent.hooks.afterFileEdit.length).toBe(2);
      expect(hooksContent.hooks.afterFileEdit[1].command).toBe(npmBiomeCommand);
    });

    test("update skips adding hook when ultracite hook already exists in hooks.json", async () => {
      const existingHooks = `{"version": 1, "hooks": {"afterFileEdit": [{"command": "${npmBiomeCommand}"}]}}`;
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingHooks)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const hooks = createHooks("cursor", "npm");
      await hooks.update();

      // Should not write anything since hook already exists
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });

  describe("copilot hooks", () => {
    test("create writes .github/hooks/ultracite.json with correct structure", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const hooks = createHooks("copilot", "npm");
      await hooks.create();

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe(".github/hooks/ultracite.json");

      const content = JSON.parse(writeCall[1] as string);
      expect(content.hooks.PostToolUse).toHaveLength(1);
      expect(content.hooks.PostToolUse[0].type).toBe("command");
      expect(content.hooks.PostToolUse[0].command).toBe(npmBiomeCommand);
    });

    test("update merges hooks into existing config when ultracite not present", async () => {
      const existingConfig =
        '{"hooks":{"PostToolUse":[{"type":"command","command":"echo test"}]}}';
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const hooks = createHooks("copilot", "npm");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [hooksWrite] = mockWriteFile.mock.calls;
      expect(hooksWrite[0]).toBe(".github/hooks/ultracite.json");

      const merged = JSON.parse(hooksWrite[1] as string);
      expect(merged.hooks.PostToolUse.length).toBe(2);
      expect(merged.hooks.PostToolUse[1].command).toBe(npmBiomeCommand);
    });

    test("update skips when ultracite hook already exists", async () => {
      const existingConfig = `{"hooks":{"PostToolUse":[{"type":"command","command":"${npmBiomeCommand}"}]}}`;
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const hooks = createHooks("copilot", "npm");
      await hooks.update();

      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });

  describe("codebuddy hooks", () => {
    test("create writes .codebuddy/settings.json with PostToolUse hooks", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const hooks = createHooks("codebuddy", "npm");
      await hooks.create();

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe(".codebuddy/settings.json");

      const content = JSON.parse(writeCall[1] as string);
      expect(content.hooks.PostToolUse).toHaveLength(1);
      expect(content.hooks.PostToolUse[0].matcher).toBe("Write|Edit");
      expect(content.hooks.PostToolUse[0].hooks[0].type).toBe("command");
      expect(content.hooks.PostToolUse[0].hooks[0].timeout).toBe(20);
      expect(content.hooks.PostToolUse[0].hooks[0].command).toBe(
        npmBiomeCommand
      );
    });

    test("update merges hooks into existing settings when ultracite is not present", async () => {
      const existingSettings =
        '{"model":"yuanbao-code","permissions":{"bash":true}}';
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingSettings)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const hooks = createHooks("codebuddy", "npm");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [hooksWrite] = mockWriteFile.mock.calls;
      expect(hooksWrite[0]).toBe(".codebuddy/settings.json");

      const merged = JSON.parse(hooksWrite[1] as string);
      expect(merged.model).toBe("yuanbao-code");
      expect(merged.permissions.bash).toBe(true);
      expect(merged.hooks.PostToolUse).toHaveLength(1);
      expect(merged.hooks.PostToolUse[0].hooks[0].command).toBe(
        npmBiomeCommand
      );
    });

    test("update skips when ultracite hook already exists in settings", async () => {
      const existingSettings = `{"hooks":{"PostToolUse":[{"matcher":"Write|Edit","hooks":[{"type":"command","timeout":20,"command":"${npmBiomeCommand}"}]}]}}`;
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingSettings)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const hooks = createHooks("codebuddy", "npm");
      await hooks.update();

      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });

  describe("claude hooks", () => {
    test("create writes .claude/settings.json with correct structure", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const hooks = createHooks("claude", "npm");
      await hooks.create();

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe(".claude/settings.json");

      const content = JSON.parse(writeCall[1] as string);
      expect(content.hooks.PostToolUse).toHaveLength(1);
      expect(content.hooks.PostToolUse[0].matcher).toBe("Write|Edit");
      expect(content.hooks.PostToolUse[0].hooks[0].type).toBe("command");
      expect(content.hooks.PostToolUse[0].hooks[0].command).toBe(
        npmBiomeCommand
      );
    });

    test("update merges hooks into existing settings when ultracite not present", async () => {
      const existingSettings = '{"model": "claude-3-5-sonnet"}';
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingSettings)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const hooks = createHooks("claude", "npm");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const [hooksWrite] = mockWriteFile.mock.calls;
      expect(hooksWrite[0]).toBe(".claude/settings.json");

      const merged = JSON.parse(hooksWrite[1] as string);
      expect(merged.model).toBe("claude-3-5-sonnet");
      expect(merged.hooks.PostToolUse).toHaveLength(1);
    });

    test("update skips when ultracite hook already exists in settings", async () => {
      const existingSettings = `{"hooks":{"PostToolUse":[{"matcher":"Write|Edit","hooks":[{"type":"command","command":"${npmBiomeCommand}"}]}]}}`;
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingSettings)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const hooks = createHooks("claude", "npm");
      await hooks.update();

      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
