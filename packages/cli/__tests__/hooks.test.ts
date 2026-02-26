import { describe, expect, mock, test } from "bun:test";
import { createHooks } from "../src/hooks";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
  mkdir: mock(() => Promise.resolve()),
}));

describe("createHooks", () => {
  // Note: We don't call mock.restore() here because it causes issues
  // with module re-loading when the tests transition between each other

  describe("invalid editor or hook integration", () => {
    test("throws error for invalid editor or hook integration name", () => {
      expect(() => {
        // @ts-expect-error - Testing invalid hook integration name
        createHooks("invalid-editor-name", "npm");
      }).toThrow('Hook integration "invalid-editor-name" not found');
    });

    test("throws error for editor without hooks support", () => {
      expect(() => {
        // @ts-expect-error - Testing editor that may not support hooks
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
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("cursor", "npm");
      const result = await hooks.exists();
      expect(result).toBe(true);
    });

    test("create creates directory and hooks.json file", async () => {
      const mockMkdir = mock(() => Promise.resolve());
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mockMkdir,
      }));

      const hooks = createHooks("cursor", "npm");
      await hooks.create();

      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });

    test("create writes hooks.json with correct structure", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("cursor", "npm");
      await hooks.create();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe(".cursor/hooks.json");
      const content = JSON.parse(writeCall[1] as string);
      expect(content.version).toBe(1);
      expect(content.hooks.afterFileEdit).toHaveLength(1);
      expect(content.hooks.afterFileEdit[0].command).toBe("npx ultracite fix");
    });

    test("update creates hooks.json if it doesn't exist", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("cursor", "npm");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe(".cursor/hooks.json");
    });

    test("update adds ultracite hook when not present in hooks.json", async () => {
      const existingHooks =
        '{"version": 1, "hooks": {"afterFileEdit": [{"command": "echo test"}]}}';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingHooks)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("cursor", "npm");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const hooksWrite = mockWriteFile.mock.calls[0];
      expect(hooksWrite[0]).toBe(".cursor/hooks.json");
      const hooksContent = JSON.parse(hooksWrite[1] as string);
      expect(hooksContent.hooks.afterFileEdit.length).toBe(2);
      expect(hooksContent.hooks.afterFileEdit[1].command).toBe(
        "npx ultracite fix"
      );
    });

    test("update skips adding hook when ultracite hook already exists in hooks.json", async () => {
      const existingHooks =
        '{"version": 1, "hooks": {"afterFileEdit": [{"command": "npx ultracite fix"}]}}';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingHooks)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("cursor", "npm");
      await hooks.update();

      // Should not write anything since hook already exists
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });

  describe("copilot hooks", () => {
    test("create writes .github/hooks/ultracite.json with correct structure", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("copilot", "npm");
      await hooks.create();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe(".github/hooks/ultracite.json");

      const content = JSON.parse(writeCall[1] as string);
      expect(content.hooks.PostToolUse).toHaveLength(1);
      expect(content.hooks.PostToolUse[0].type).toBe("command");
      expect(content.hooks.PostToolUse[0].command).toBe("npx ultracite fix");
    });

    test("update merges hooks into existing config when ultracite not present", async () => {
      const existingConfig = '{"hooks":{"PostToolUse":[{"type":"command","command":"echo test"}]}}';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("copilot", "npm");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const hooksWrite = mockWriteFile.mock.calls[0];
      expect(hooksWrite[0]).toBe(".github/hooks/ultracite.json");

      const merged = JSON.parse(hooksWrite[1] as string);
      expect(merged.hooks.PostToolUse.length).toBe(2);
      expect(merged.hooks.PostToolUse[1].command).toBe("npx ultracite fix");
    });

    test("update skips when ultracite hook already exists", async () => {
      const existingConfig =
        '{"hooks":{"PostToolUse":[{"type":"command","command":"npx ultracite fix"}]}}';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingConfig)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("copilot", "npm");
      await hooks.update();

      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });

  describe("claude hooks", () => {
    test("create writes .claude/settings.json with correct structure", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("claude", "npm");
      await hooks.create();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe(".claude/settings.json");

      const content = JSON.parse(writeCall[1] as string);
      expect(content.hooks.PostToolUse).toHaveLength(1);
      expect(content.hooks.PostToolUse[0].matcher).toBe("Write|Edit");
      expect(content.hooks.PostToolUse[0].hooks[0].type).toBe("command");
      expect(content.hooks.PostToolUse[0].hooks[0].command).toBe(
        "npx ultracite fix"
      );
    });

    test("update merges hooks into existing settings when ultracite not present", async () => {
      const existingSettings = '{"model": "claude-3-5-sonnet"}';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingSettings)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("claude", "npm");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const hooksWrite = mockWriteFile.mock.calls[0];
      expect(hooksWrite[0]).toBe(".claude/settings.json");

      const merged = JSON.parse(hooksWrite[1] as string);
      expect(merged.model).toBe("claude-3-5-sonnet");
      expect(merged.hooks.PostToolUse).toHaveLength(1);
    });

    test("update skips when ultracite hook already exists in settings", async () => {
      const existingSettings =
        '{"hooks":{"PostToolUse":[{"matcher":"Write|Edit","hooks":[{"type":"command","command":"npx ultracite fix"}]}]}}';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingSettings)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("claude", "npm");
      await hooks.update();

      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
