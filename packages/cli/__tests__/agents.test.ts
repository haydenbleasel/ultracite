import { describe, expect, mock, test } from "bun:test";
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
  // Note: We don't call mock.restore() here because it causes issues
  // with module re-loading when the tests transition between each other

  describe("invalid agent", () => {
    test("throws error for invalid agent name", () => {
      expect(() => {
        // @ts-expect-error - Testing invalid agent name
        createAgents("invalid-agent-name", "npm");
      }).toThrow('Agent "invalid-agent-name" not found');
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
      expect(writeCall[0]).toBe(".github/copilot-instructions.md");
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

  describe("cline agent", () => {
    test("create creates .clinerules file", async () => {
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("cline", "npm");
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe(".clinerules");
    });

    test("update appends to .clinerules file", async () => {
      const existingContent = "Existing cline rules";
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
        mkdir: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("cline", "npm");
      await agents.update();

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("Existing cline rules");
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

      const agents = createAgents("cline", "npm");
      await agents.update();

      expect(mockWriteFile).toHaveBeenCalled();
      // Should write the content since file doesn't exist
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe(".clinerules");
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
      expect(writeCall[0]).toBe(".claude/CLAUDE.md");
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

      const agents = createAgents("junie", "npm");
      await agents.create();

      expect(mockMkdir).toHaveBeenCalled();
      const mkdirCall = mockMkdir.mock.calls[0];
      expect(mkdirCall[0]).toBe(".junie");
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
