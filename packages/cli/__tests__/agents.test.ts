import { describe, expect, mock, test } from "bun:test";
import type { MakeDirectoryOptions } from "node:fs";

import {
  createAgents,
  getAgentFileTargets,
  replaceRulesBlock,
} from "../src/agents";
import { getRules } from "../src/data/rules";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

mock.module("node:fs/promises", () => ({
  access: mock((_path: string) => Promise.reject(new Error("ENOENT"))),
  mkdir: mock((_path: string) => Promise.resolve()),
  readFile: mock((_path: string) => Promise.resolve("")),
  writeFile: mock((_path: string, _content: string) => Promise.resolve()),
}));

// Paths the last mockProject run removed.
const removed = new Set<string>();

// A project whose files are exactly `files`; returns what gets written.
const mockProject = (files: Record<string, string>) => {
  const written = new Map<string, string>();
  removed.clear();

  mock.module("node:fs/promises", () => ({
    access: mock((path: string) =>
      path in files ? Promise.resolve() : Promise.reject(new Error("ENOENT"))
    ),
    mkdir: mock(() => Promise.resolve()),
    readFile: mock((path: string) =>
      path in files
        ? Promise.resolve(files[path])
        : Promise.reject(new Error("ENOENT"))
    ),
    rm: mock((path: string) => {
      removed.add(path);
      return Promise.resolve();
    }),
    writeFile: mock((path: string, content: string) => {
      written.set(path, content);
      return Promise.resolve();
    }),
  }));
  mockFileSystem(files);

  return written;
};

const countHeaders = (text: string | undefined): number =>
  (text ?? "")
    .split(/\r?\n/u)
    .filter((line) => line === "# Ultracite Code Standards").length;

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

    test("throws error for invalid linter name", () => {
      expect(() => {
        // @ts-expect-error - Testing invalid linter name
        createAgents("claude", "npm", "invalid-linter");
      }).toThrow('Provider "invalid-linter" not found');
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

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
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

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
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
      const mockMkdirSync = mock(
        (_path: string, _opts?: MakeDirectoryOptions) => {}
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        mkdirSync: mockMkdirSync,
        readFileSync: mock(() => "{}"),
      }));

      const agents = createAgents("claude", "npm", "biome");
      await agents.create();

      expect(mockMkdirSync).toHaveBeenCalled();
      const [mkdirCall] = mockMkdirSync.mock.calls;
      expect(mkdirCall[0]).toBe(".claude");
    });

    test("does not create directory for root-level files", async () => {
      const mockMkdirSync = mock(
        (_path: string, _opts?: MakeDirectoryOptions) => {}
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        mkdirSync: mockMkdirSync,
        readFileSync: mock(() => "{}"),
      }));

      const agents = createAgents("codex", "npm", "biome");
      await agents.create();

      // Should not be called for root-level AGENTS.md
      expect(mockMkdirSync).not.toHaveBeenCalled();
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

  test("sorts AGENTS.md target to the front", () => {
    const targets = getAgentFileTargets();
    // AGENTS.md (universal) should always be first
    expect(targets[0].path).toBe("AGENTS.md");
    // Non-AGENTS.md targets should come after
    for (let i = 1; i < targets.length; i += 1) {
      expect(targets[i].path).not.toBe("AGENTS.md");
    }
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

describe("rule file re-runs", () => {
  test("replaces the block when the linter changes instead of adding one", async () => {
    const written = mockProject({
      "AGENTS.md": `# Team notes\n\n${getRules("npx ultracite", "Biome")}\n## Our own section\n\nKeep me.\n`,
    });

    await createAgents("codex", "npm", "oxlint").update();
    restoreFileSystemMock();

    const output = written.get("AGENTS.md");
    expect(countHeaders(output)).toBe(1);
    expect(output).toContain("# Team notes");
    expect(output).toContain("fixed by Oxlint + Oxfmt.");
    expect(output).not.toContain("fixed by Biome.");
    expect(output).toContain("## Our own section\n\nKeep me.\n");
  });

  test("collapses duplicate blocks written by earlier versions", async () => {
    const written = mockProject({
      "AGENTS.md": [
        "Intro",
        getRules("npm exec -- ultracite", "Biome"),
        getRules("npm exec -- ultracite", "Oxlint + Oxfmt"),
        getRules("bun x ultracite", "Oxlint + Oxfmt"),
      ].join("\n\n"),
    });

    await createAgents("codex", "bun", "oxlint").update();
    restoreFileSystemMock();

    const output = written.get("AGENTS.md") ?? "";
    expect(countHeaders(output)).toBe(1);
    expect(output.startsWith("Intro\n\n# Ultracite Code Standards")).toBe(true);
    expect(output).toContain("`bunx ultracite fix`");
  });

  test("replaces the block of a CRLF file and keeps its line endings", async () => {
    const rules = getRules("npx ultracite", "Biome").replaceAll("\n", "\r\n");
    const written = mockProject({ "AGENTS.md": `Intro\r\n\r\n${rules}` });

    await createAgents("codex", "yarn", "biome").update();
    restoreFileSystemMock();

    const output = written.get("AGENTS.md") ?? "";
    expect(countHeaders(output)).toBe(1);
    expect(output).toContain("`yarn ultracite fix`");
    expect(output.replaceAll("\r\n", "")).not.toContain("\n");
  });

  test("leaves the file alone when the block is already current", async () => {
    const written = mockProject({
      "AGENTS.md": `Intro\n\n${getRules("npx ultracite", "Biome")}`,
    });

    await createAgents("codex", "npm", "biome").update();
    restoreFileSystemMock();

    expect(written.size).toBe(0);
  });

  test("replaceRulesBlock stops at the next heading when a block has no closing line", () => {
    const replaced = replaceRulesBlock(
      "# Ultracite Code Standards\n\nOld rules\n\n# Mine\n\nKeep\n",
      "# Ultracite Code Standards\n\nNew rules\n"
    );

    expect(replaced).toBe(
      "# Ultracite Code Standards\n\nNew rules\n\n# Mine\n\nKeep\n"
    );
  });

  test.each([
    ["deno", "`deno run -A npm:ultracite fix`"],
    ["yarn", "`yarn ultracite fix`"],
    ["pnpm", "`pnpm exec ultracite fix`"],
  ] as const)(
    "tells agents how to run the installed CLI with %s",
    async (packageManager, expected) => {
      const written = mockProject({});

      await createAgents("codex", packageManager, "biome").create();
      restoreFileSystemMock();

      expect(written.get("AGENTS.md")).toContain(expected);
    }
  );
});

describe("firebender rules", () => {
  test("writes an always-applied .mdc rule instead of Markdown in firebender.json", async () => {
    const written = mockProject({});

    await createAgents("firebender", "npm", "biome").create();
    restoreFileSystemMock();

    const rule = written.get(".firebender/rules/ultracite.mdc") ?? "";
    expect(rule.startsWith("---\n")).toBe(true);
    expect(rule).toContain("alwaysApply: true");
    expect(rule).toContain("# Ultracite Code Standards");
    expect(written.has("firebender.json")).toBe(false);
  });

  test("resets a firebender.json that an earlier version filled with Markdown", async () => {
    const written = mockProject({
      "firebender.json": getRules("npx ultracite", "Biome"),
    });

    await createAgents("firebender", "npm", "biome").create();
    restoreFileSystemMock();

    expect(written.get("firebender.json")).toBe("{}\n");
  });

  test("leaves a real firebender.json alone", async () => {
    const written = mockProject({
      "firebender.json": '{"rules":["Use Kotlin"]}',
    });

    await createAgents("firebender", "npm", "biome").create();
    restoreFileSystemMock();

    expect(written.has("firebender.json")).toBe(false);
  });
});

describe("aider", () => {
  test("writes the rules to AGENTS.md and points .aider.conf.yml at them", async () => {
    const written = mockProject({});

    await createAgents("aider", "pnpm", "oxlint").create();
    restoreFileSystemMock();

    expect(written.get("AGENTS.md")).toContain("# Ultracite Code Standards");
    expect(written.get(".aider.conf.yml")).toBe(
      "read: AGENTS.md\nlint-cmd: pnpm exec ultracite fix\n"
    );
    expect(written.has("ultracite.md")).toBe(false);
  });

  test("merges into an existing .aider.conf.yml", async () => {
    const written = mockProject({
      ".aider.conf.yml":
        "# Team settings\nmodel: sonnet\nauto-commits: false\n",
    });

    await createAgents("aider", "npm", "biome").create();
    restoreFileSystemMock();

    expect(written.get(".aider.conf.yml")).toBe(
      "# Team settings\nmodel: sonnet\nauto-commits: false\nread: AGENTS.md\nlint-cmd: npx ultracite fix\n"
    );
  });

  test("removes the ultracite.md earlier versions wrote", async () => {
    mockProject({
      ".aider.conf.yml": "read: ultracite.md\n",
      "ultracite.md": getRules("npx ultracite", "Biome"),
    });

    await createAgents("aider", "npm", "biome").create();
    restoreFileSystemMock();

    expect(removed.has("ultracite.md")).toBe(true);
  });

  test("keeps an ultracite.md that holds more than the rules", async () => {
    mockProject({
      "ultracite.md": `${getRules("npx ultracite", "Biome")}\n# Our notes\n\nKeep these.\n`,
    });

    await createAgents("aider", "npm", "biome").create();
    restoreFileSystemMock();

    expect(removed.has("ultracite.md")).toBe(false);
  });

  test("gets its own setup option rather than riding on universal", () => {
    const targets = getAgentFileTargets();
    const universal = targets.find((target) => target.id === "universal");
    const aiderTarget = targets.find((target) => target.id === "aider");

    expect(universal?.agentIds).not.toContain("aider");
    expect(aiderTarget?.promptLabel).toBe(
      "Aider (creates .aider.conf.yml and AGENTS.md)"
    );
  });
});

// A project whose `dir` is a symlink resolving outside it. Returns the
// mkdirSync mock, which must not run before the write is refused.
const mockEscapingDirectory = (dir: string) => {
  const mkdirSync = mock(() => {});

  mock.module("node:fs/promises", () => ({
    readFile: mock(() => Promise.reject(new Error("ENOENT"))),
    writeFile: mock(() => Promise.resolve()),
  }));
  mock.module("node:fs", () => ({
    accessSync: mock(() => {
      throw new Error("ENOENT");
    }),
    existsSync: mock(() => false),
    lstatSync: mock(() => ({ isSymbolicLink: () => false })),
    mkdirSync,
    readFileSync: mock(() => "{}"),
    realpathSync: mock((filePath: string) =>
      String(filePath).includes(dir) ? `/elsewhere/${dir}` : filePath
    ),
  }));

  return mkdirSync;
};

describe("writing outside the project", () => {
  test("refuses before creating the agent's directory", async () => {
    const mkdirSync = mockEscapingDirectory(".claude");

    try {
      await expect(
        createAgents("claude", "npm", "biome").create()
      ).rejects.toThrow("Refusing to write");
      expect(mkdirSync).not.toHaveBeenCalled();
    } finally {
      restoreFileSystemMock();
    }
  });
});
