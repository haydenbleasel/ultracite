import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createHooks } from "../src/hooks";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
  mkdir: mock(() => Promise.resolve()),
}));

describe("createHooks", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("cursor hooks", () => {
    test("exists returns true when hooks.json exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.cursor/hooks.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("cursor");
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

      const hooks = createHooks("cursor");
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

      const hooks = createHooks("cursor");
      await hooks.create();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.cursor/hooks.json");
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

      const hooks = createHooks("cursor");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.cursor/hooks.json");
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

      const hooks = createHooks("cursor");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const hooksWrite = mockWriteFile.mock.calls[0];
      expect(hooksWrite[0]).toBe("./.cursor/hooks.json");
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

      const hooks = createHooks("cursor");
      await hooks.update();

      // Should not write anything since hook already exists
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });

  describe("claude hooks", () => {
    test("exists returns true when settings.json exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.claude/settings.json") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("claude");
      const result = await hooks.exists();
      expect(result).toBe(true);
    });

    test("create creates directory and settings.json file", async () => {
      const mockMkdir = mock(() => Promise.resolve());
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mockMkdir,
      }));

      const hooks = createHooks("claude");
      await hooks.create();

      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });

    test("create writes settings.json with correct structure", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("claude");
      await hooks.create();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.claude/settings.json");
      const content = JSON.parse(writeCall[1] as string);
      expect(content.hooks.PostToolUse).toHaveLength(1);
      expect(content.hooks.PostToolUse[0].matcher).toBe("Edit|Write");
      expect(content.hooks.PostToolUse[0].hooks).toHaveLength(1);
      expect(content.hooks.PostToolUse[0].hooks[0].type).toBe("command");
      expect(content.hooks.PostToolUse[0].hooks[0].command).toBe(
        "npx ultracite fix"
      );
    });

    test("update creates settings.json if it doesn't exist", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("claude");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.claude/settings.json");
    });

    test("update adds ultracite hook when not present in settings.json", async () => {
      const existingSettings = JSON.stringify({
        hooks: {
          PostToolUse: [
            {
              matcher: "*",
              hooks: [{ type: "command", command: "echo test" }],
            },
          ],
        },
      });
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingSettings)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("claude");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const settingsWrite = mockWriteFile.mock.calls[0];
      expect(settingsWrite[0]).toBe("./.claude/settings.json");
      const settingsContent = JSON.parse(settingsWrite[1] as string);
      expect(settingsContent.hooks.PostToolUse.length).toBe(2);
      expect(settingsContent.hooks.PostToolUse[1].matcher).toBe("Edit|Write");
      expect(settingsContent.hooks.PostToolUse[1].hooks[0].command).toBe(
        "npx ultracite fix"
      );
    });

    test("update skips adding hook when ultracite hook already exists in settings.json", async () => {
      const existingSettings = JSON.stringify({
        hooks: {
          PostToolUse: [
            {
              matcher: "Edit|Write",
              hooks: [{ type: "command", command: "npx ultracite fix" }],
            },
          ],
        },
      });
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingSettings)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("claude");
      await hooks.update();

      // Should not write anything since hook already exists
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("update initializes hooks structure when missing", async () => {
      const existingSettings = JSON.stringify({
        someOtherSetting: "value",
      });
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingSettings)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const hooks = createHooks("claude");
      await hooks.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const settingsWrite = mockWriteFile.mock.calls[0];
      const settingsContent = JSON.parse(settingsWrite[1] as string);
      expect(settingsContent.hooks).toBeDefined();
      expect(settingsContent.hooks.PostToolUse).toBeDefined();
      expect(settingsContent.someOtherSetting).toBe("value");
    });
  });
});
