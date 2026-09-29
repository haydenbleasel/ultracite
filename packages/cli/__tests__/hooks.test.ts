import { describe, expect, mock, test } from "bun:test";

import { createHooks } from "../src/hooks";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  mkdir: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
}));

const npmBiomeCommand =
  "npm run fix -- --skip=correctness/noUnusedImports --hook";
const npmBiomeCommandWithoutHook =
  "npm run fix -- --skip=correctness/noUnusedImports";

// Updates `path` holding `existing`; returns the parsed write, if any.
const runUpdate = async (
  hook: "claude" | "copilot",
  existing: string,
  packageManager: "bun" | "npm" | "pnpm" = "npm"
) => {
  const mockWriteFile = mock((_path: string, _content: string) =>
    Promise.resolve()
  );

  mock.module("node:fs/promises", () => ({
    access: mock(() => Promise.resolve()),
    mkdir: mock(() => Promise.resolve()),
    readFile: mock(() => Promise.resolve(existing)),
    writeFile: mockWriteFile,
  }));

  mock.module("node:fs", () => ({
    accessSync: mock(() => {}),
    existsSync: mock(() => false),
    readFileSync: mock(() => "{}"),
  }));

  await createHooks(hook, packageManager).update();

  const [write] = mockWriteFile.mock.calls;
  return write ? JSON.parse(write[1]) : undefined;
};

const claudeCommands = (settings: {
  hooks: { PostToolUse: { hooks: { command: string }[] }[] };
}) =>
  settings.hooks.PostToolUse.flatMap((entry) =>
    entry.hooks.map((hook) => hook.command)
  );

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

    test("throws error for unsupported package manager names", () => {
      expect(() => {
        // SAFETY: deliberately bypasses the PackageManagerName union to
        // exercise the runtime validation error for unsupported names.
        createHooks("claude", "node" as never);
      }).toThrow('Unsupported package manager "node"');
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
      const content = JSON.parse(writeCall[1]);
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
      const hooksContent = JSON.parse(hooksWrite[1]);
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

      const content = JSON.parse(writeCall[1]);
      // The Copilot CLI and cloud agent only read this format.
      expect(content.version).toBe(1);
      expect(content.hooks.postToolUse).toHaveLength(1);
      expect(content.hooks.postToolUse[0].type).toBe("command");
      expect(content.hooks.postToolUse[0].command).toBe(npmBiomeCommand);
    });

    test("update merges hooks into existing config when ultracite not present", async () => {
      const existingConfig =
        '{"version":1,"hooks":{"postToolUse":[{"type":"command","command":"echo test"}]}}';
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

      const merged = JSON.parse(hooksWrite[1]);
      expect(merged.hooks.postToolUse.length).toBe(2);
      expect(merged.hooks.postToolUse[1].command).toBe(npmBiomeCommand);
    });

    test("update skips when ultracite hook already exists", async () => {
      const existingConfig = `{"hooks":{"postToolUse":[{"type":"command","command":"${npmBiomeCommand}"}]},"version":1}`;
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

      const content = JSON.parse(writeCall[1]);
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

      const merged = JSON.parse(hooksWrite[1]);
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

    // The pre-`--hook` command, and commands from an earlier init with a
    // different linter or package manager, are all rewritten to the current
    // command rather than kept or joined by a second hook.
    const outdatedCommands = [
      npmBiomeCommandWithoutHook,
      "npm run fix",
      "npm run fix -- --hook",
      "pnpm run fix --skip=correctness/noUnusedImports",
      "bun run fix --hook",
    ];

    test("update leaves a user's own hook alone while upgrading the generated one", async () => {
      const userHook = `{"hooks":[{"type":"command","command":"npm run fix"}]}`;
      const existingSettings = `{"hooks":{"Stop":[${userHook}],"PostToolUse":[{"matcher":"Write|Edit","hooks":[{"type":"command","timeout":20,"command":"${npmBiomeCommandWithoutHook}"}]}]}}`;
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

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const [hooksWrite] = mockWriteFile.mock.calls;
      const upgraded = JSON.parse(hooksWrite[1]);
      expect(upgraded.hooks.Stop).toEqual([JSON.parse(userHook)]);
      expect(upgraded.hooks.PostToolUse).toHaveLength(1);
      expect(upgraded.hooks.PostToolUse[0].hooks[0].command).toBe(
        npmBiomeCommand
      );
    });

    test("update adds the hook next to a user's own hook that runs the fix script", async () => {
      const userHook = `{"hooks":[{"type":"command","command":"npm run fix"}]}`;
      const existingSettings = `{"hooks":{"Stop":[${userHook}]}}`;
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

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const [hooksWrite] = mockWriteFile.mock.calls;
      const merged = JSON.parse(hooksWrite[1]);
      expect(merged.hooks.Stop).toEqual([JSON.parse(userHook)]);
      expect(merged.hooks.PostToolUse).toHaveLength(1);
      expect(merged.hooks.PostToolUse[0].hooks[0].command).toBe(
        npmBiomeCommand
      );
    });

    for (const outdatedCommand of outdatedCommands) {
      test(`update upgrades an outdated hook command (${outdatedCommand})`, async () => {
        const existingSettings = `{"hooks":{"PostToolUse":[{"matcher":"Write|Edit","hooks":[{"type":"command","timeout":20,"command":"${outdatedCommand}"}]}]}}`;
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

        expect(mockWriteFile).toHaveBeenCalledTimes(1);
        const [hooksWrite] = mockWriteFile.mock.calls;
        expect(hooksWrite[0]).toBe(".codebuddy/settings.json");

        const upgraded = JSON.parse(hooksWrite[1]);
        expect(upgraded.hooks.PostToolUse).toHaveLength(1);
        expect(upgraded.hooks.PostToolUse[0].hooks[0]).toEqual({
          command: npmBiomeCommand,
          timeout: 20,
          type: "command",
        });
      });
    }
  });

  describe("claude hooks", () => {
    test("create uses the nub run script for nub projects", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const hooks = createHooks("claude", "nub");
      await hooks.create();

      const [writeCall] = mockWriteFile.mock.calls;
      const content = JSON.parse(writeCall[1]);
      expect(content.hooks.PostToolUse[0].hooks[0].command).toBe(
        "nub run fix --skip=correctness/noUnusedImports --hook"
      );
    });

    test("create uses the aube run script for aube projects", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const hooks = createHooks("claude", "aube");
      await hooks.create();

      const [writeCall] = mockWriteFile.mock.calls;
      const content = JSON.parse(writeCall[1]);
      expect(content.hooks.PostToolUse[0].hooks[0].command).toBe(
        "aube run fix --skip=correctness/noUnusedImports --hook"
      );
    });

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

      const content = JSON.parse(writeCall[1]);
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

      const merged = JSON.parse(hooksWrite[1]);
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

  describe("regressions", () => {
    test("adds the hook when ultracite is only mentioned outside a hook", async () => {
      const written = await runUpdate(
        "claude",
        '{"permissions":{"allow":["Bash(npx ultracite check)"]}}'
      );

      expect(written.permissions.allow).toEqual(["Bash(npx ultracite check)"]);
      expect(claudeCommands(written)).toEqual([npmBiomeCommand]);
    });

    for (const [packageManager, legacy, current] of [
      [
        "pnpm",
        "pnpm fix --skip=correctness/noUnusedImports",
        "pnpm run fix --skip=correctness/noUnusedImports --hook",
      ],
      [
        "bun",
        "bun fix --skip=correctness/noUnusedImports",
        "bun run fix --skip=correctness/noUnusedImports --hook",
      ],
      [
        "npm",
        "npm run fix --skip=correctness/noUnusedImports",
        npmBiomeCommand,
      ],
    ] as const) {
      test(`upgrades a hook written before 7.8.3 (${legacy})`, async () => {
        const written = await runUpdate(
          "claude",
          `{"hooks":{"PostToolUse":[{"matcher":"Write|Edit","hooks":[{"type":"command","command":"${legacy}"}]}]}}`,
          packageManager
        );

        expect(claudeCommands(written)).toEqual([current]);
      });
    }

    test("moves a Copilot hook from the old format instead of running it twice", async () => {
      const written = await runUpdate(
        "copilot",
        `{"hooks":{"PostToolUse":[{"type":"command","command":"npm run fix -- --skip=correctness/noUnusedImports"},{"type":"command","command":"echo mine"}]}}`
      );

      expect(written).toEqual({
        hooks: {
          PostToolUse: [{ command: "echo mine", type: "command" }],
          postToolUse: [{ command: npmBiomeCommand, type: "command" }],
        },
        version: 1,
      });
    });

    test("drops the old Copilot event entirely when only ultracite used it", async () => {
      const written = await runUpdate(
        "copilot",
        `{"hooks":{"PostToolUse":[{"type":"command","command":"${npmBiomeCommand}"}]}}`
      );

      expect(written).toEqual({
        hooks: {
          postToolUse: [{ command: npmBiomeCommand, type: "command" }],
        },
        version: 1,
      });
    });
  });
});
