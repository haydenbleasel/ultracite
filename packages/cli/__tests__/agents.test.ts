import { describe, expect, mock, test } from "bun:test";

import { createAgents, getAgentFileTargets } from "../src/agents";

mock.module("node:fs/promises", () => ({
  access: mock((_path: string) => Promise.reject(new Error("ENOENT"))),
  mkdir: mock((_path: string) => Promise.resolve()),
  readFile: mock((_path: string) => Promise.resolve("")),
  writeFile: mock((_path: string, _content: string) => Promise.resolve()),
}));

mock.module("nypm", () => ({
  detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
  dlxCommand: mock((pm: string, pkg: string) => {
    const prefixMap: Record<string, string> = {
      bun: "bunx",
      pnpm: "pnpm dlx",
      yarn: "yarn dlx",
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
    test("create creates AGENTS.md instructions", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((_path: string) => Promise.reject(new Error("ENOENT"))),
        mkdir: mock((_path: string) => Promise.resolve()),
        readFile: mock((_path: string) => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const agents = createAgents("copilot", "npm", "biome");
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("AGENTS.md");
      expect(writeCall[1]).not.toContain("applyTo:");
    });

    test("update uses append mode", async () => {
      const existingContent = "Existing instructions";
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      const agents = createAgents("copilot", "npm", "biome");
      await agents.update();

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("Existing instructions");
    });
  });

  describe("cline agent", () => {
    test("create creates AGENTS.md file", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const agents = createAgents("cline", "npm", "biome");
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("AGENTS.md");
    });

    test("update appends to AGENTS.md file", async () => {
      const existingContent = "Existing AGENTS rules";
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      const agents = createAgents("cline", "npm", "biome");
      await agents.update();

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("Existing AGENTS rules");
    });

    test("update creates file when it does not exist in append mode", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock((_path: string) => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const agents = createAgents("cline", "npm", "biome");
      await agents.update();

      expect(mockWriteFile).toHaveBeenCalled();
      // Should write the content since file doesn't exist
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("AGENTS.md");
    });
  });

  describe("replit agent", () => {
    test("create creates replit.md file", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const agents = createAgents("replit", "npm", "biome");
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("replit.md");
    });
  });

  describe("claude agent", () => {
    test("create creates CLAUDE.md file", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      const agents = createAgents("claude", "npm", "biome");
      await agents.create();

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe(".claude/CLAUDE.md");
    });
  });

  describe("directory creation", () => {
    test("creates parent directory when needed", async () => {
      const mockMkdir = mock((_path: string, _opts?: Record<string, unknown>) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mockMkdir,
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("claude", "npm", "biome");
      await agents.create();

      expect(mockMkdir).toHaveBeenCalled();
      const [mkdirCall] = mockMkdir.mock.calls;
      expect(mkdirCall[0]).toBe(".claude");
    });

    test("does not create directory for root-level files", async () => {
      const mockMkdir = mock((_path: string, _opts?: Record<string, unknown>) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mockMkdir,
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      const agents = createAgents("codex", "npm", "biome");
      await agents.create();

      // Should not be called for root-level AGENTS.md
      expect(mockMkdir).not.toHaveBeenCalled();
    });
  });
});

describe("getAgentFileTargets", () => {
  test("groups AGENTS.md integrations into a universal option", () => {
    const targets = getAgentFileTargets();
    const universalTarget = targets.find((target) => target.id === "universal");

    expect(universalTarget).toEqual(
      expect.objectContaining({
        displayName: "Universal",
        path: "AGENTS.md",
        representativeAgentId: "codex",
      })
    );
    expect(universalTarget?.agentIds).toEqual(
      expect.arrayContaining(["codex", "jules", "devin", "copilot", "cline"])
    );
    expect(universalTarget?.promptLabel).toContain("creates AGENTS.md");
  });

  test("keeps agent-specific files as dedicated options", () => {
    const targets = getAgentFileTargets();
    const claudeTarget = targets.find((target) => target.id === "claude");

    expect(claudeTarget).toEqual(
      expect.objectContaining({
        displayName: "Claude",
        path: ".claude/CLAUDE.md",
        promptLabel: "Claude (creates .claude/CLAUDE.md)",
        representativeAgentId: "claude",
      })
    );
  });
});
