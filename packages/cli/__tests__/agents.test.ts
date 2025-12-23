import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createAgents } from "../src/agents";

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
  mkdir: mock(() => Promise.resolve()),
}));

mock.module("nypm", () => ({
  detectPackageManager: mock(async () => ({ name: "npm" })),
  dlxCommand: mock((pm, pkg) => {
    const prefixMap: Record<string, string> = {
      bun: "bunx",
      yarn: "yarn dlx",
      pnpm: "pnpm dlx",
    };
    const prefix = prefixMap[pm] || "npx";
    return pkg ? `${prefix} ${pkg}` : prefix;
  }),
}));

describe("createAgents", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("cursor agent", () => {
    test("exists returns true when rules file exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock((path: string) => {
          if (path === "./.cursor/rules/ultracite.mdc") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("cursor", "npm");
      const result = await agents.exists();
      expect(result).toBe(true);
    });

    test("create creates directory and files", async () => {
      const mockMkdir = mock(() => Promise.resolve());
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mockMkdir,
      }));

      const agents = createAgents("cursor", "npm");
      await agents.create();

      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledTimes(1); // rules file only
    });

    test("create writes rules with header", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("cursor", "npm");
      await agents.create();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.cursor/rules/ultracite.mdc");
      expect(writeCall[1]).toContain("---");
      expect(writeCall[1]).toContain("description: Ultracite Rules");
    });

    test("uses correct package runner for npm", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("cursor", "npm");
      await agents.create();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("`npx ultracite fix`");
      expect(writeCall[1]).toContain("`npx ultracite check`");
    });

    test("uses correct package runner for bun", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("cursor", "bun");
      await agents.create();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("`bunx ultracite fix`");
      expect(writeCall[1]).toContain("`bunx ultracite check`");
    });

    test("uses correct package runner for yarn", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("cursor", "yarn");
      await agents.create();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("`yarn dlx ultracite fix`");
      expect(writeCall[1]).toContain("`yarn dlx ultracite check`");
    });

    test("uses correct package runner for pnpm", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("cursor", "pnpm");
      await agents.create();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("`pnpm dlx ultracite fix`");
      expect(writeCall[1]).toContain("`pnpm dlx ultracite check`");
    });

    test("update overwrites rules file (not in append mode)", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("# Existing rules")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("cursor", "npm");
      await agents.update();

      // Cursor is not in append mode, so it always overwrites
      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.cursor/rules/ultracite.mdc");
    });
  });

  describe("windsurf agent", () => {
    test("create creates windsurf rules file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("windsurf", "npm");
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.windsurf/rules/ultracite.md");
    });
  });

  describe("copilot agent", () => {
    test("create creates copilot instructions with header", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("copilot", "npm");
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.github/copilot-instructions.md");
      expect(writeCall[1]).toContain("applyTo:");
    });

    test("update uses append mode", async () => {
      const existingContent = "Existing instructions";
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("copilot", "npm");
      await agents.update();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("Existing instructions");
    });
  });

  describe("zed agent", () => {
    test("create creates .rules file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("zed", "npm");
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.rules");
    });

    test("update appends to .rules file", async () => {
      const existingContent = "Existing zed rules";
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("zed", "npm");
      await agents.update();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("Existing zed rules");
    });

    test("update creates file when it does not exist in append mode", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock((_path: string) => {
          // File doesn't exist
          return Promise.reject(new Error("ENOENT"));
        }),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("zed", "npm");
      await agents.update();

      expect(mockWriteFile).toHaveBeenCalled();
      // Should write the content since file doesn't exist
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.rules");
    });
  });

  describe("claude agent", () => {
    test("create creates CLAUDE.md file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("claude", "npm");
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.claude/CLAUDE.md");
    });
  });

  describe("antigravity agent", () => {
    test("create creates antigravity rules file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("antigravity", "npm");
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.agent/rules/ultracite.md");
    });

    test("update overwrites rules file (not in append mode)", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("# Existing rules")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("antigravity", "npm");
      await agents.update();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe("./.agent/rules/ultracite.md");
    });
  });

  describe("directory creation", () => {
    test("creates parent directory when needed", async () => {
      const mockMkdir = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mockMkdir,
      }));

      const agents = createAgents("windsurf", "npm");
      await agents.create();

      expect(mockMkdir).toHaveBeenCalled();
      const mkdirCall = mockMkdir.mock.calls[0];
      expect(mkdirCall[0]).toBe(".windsurf/rules");
    });

    test("does not create directory for root-level files", async () => {
      const mockMkdir = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
        mkdir: mockMkdir,
      }));

      const agents = createAgents("codex", "npm");
      await agents.create();

      // Should not be called for root-level AGENTS.md
      expect(mockMkdir).not.toHaveBeenCalled();
    });
  });
});
