import { describe, expect, mock, test } from "bun:test";

import {
  getAgentChoices,
  replaceRulesBlock,
  writeAgentFiles,
} from "../src/agents";
import { getRules } from "../src/data/rules";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

// Paths the last mockProject run removed.
const removed = new Set<string>();

// A project whose files start as exactly `files` and change as they're
// written and removed; returns what gets written.
const mockProject = (initial: Record<string, string>) => {
  const files = { ...initial };
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
      Reflect.deleteProperty(files, path);
      return Promise.resolve();
    }),
    writeFile: mock((path: string, content: string) => {
      written.set(path, content);
      files[path] = content;
      return Promise.resolve();
    }),
  }));
  mockFileSystem(files);

  return written;
};

// Runs writeAgentFiles in a mocked project and returns what it wrote.
const setUp = async (
  files: Record<string, string>,
  selection: Parameters<typeof writeAgentFiles>[0],
  packageManager: Parameters<typeof writeAgentFiles>[1] = "npm",
  linter: Parameters<typeof writeAgentFiles>[2] = "biome"
) => {
  const written = mockProject(files);

  try {
    const result = await writeAgentFiles(selection, packageManager, linter);
    return { result, written };
  } finally {
    restoreFileSystemMock();
  }
};

const rules = getRules("npx ultracite", "Biome");

const countHeaders = (text: string | undefined): number =>
  (text ?? "")
    .split(/\r?\n/u)
    .filter((line) => line === "# Ultracite Code Standards").length;

describe("writeAgentFiles", () => {
  test("writes the rules to AGENTS.md for an agent that needs nothing else", async () => {
    const { result, written } = await setUp({}, ["codex"]);

    expect(result).toEqual({ created: true, files: [] });
    expect([...written.keys()]).toEqual(["AGENTS.md"]);
    expect(written.get("AGENTS.md")).toBe(rules);
  });

  test("writes AGENTS.md once for several agents", async () => {
    const { written } = await setUp({}, ["universal", "codex", "copilot"]);

    expect([...written.keys()]).toEqual(["AGENTS.md"]);
  });

  test("adds the rules below an existing AGENTS.md", async () => {
    const { result, written } = await setUp(
      { "AGENTS.md": "Existing instructions" },
      ["cline"]
    );

    expect(result.created).toBe(false);
    expect(written.get("AGENTS.md")).toBe(`Existing instructions\n\n${rules}`);
  });

  test("throws for an unknown linter", async () => {
    await expect(
      // @ts-expect-error - testing an invalid linter name
      setUp({}, ["codex"], "npm", "invalid-linter")
    ).rejects.toThrow('Provider "invalid-linter" not found');
  });

  test.each([
    ["deno", "`deno run -A npm:ultracite fix`"],
    ["yarn", "`yarn ultracite fix`"],
    ["pnpm", "`pnpm exec ultracite fix`"],
  ] as const)(
    "tells agents how to run the installed CLI with %s",
    async (packageManager, expected) => {
      const { written } = await setUp({}, ["codex"], packageManager);

      expect(written.get("AGENTS.md")).toContain(expected);
    }
  );
});

describe("rule file re-runs", () => {
  test("replaces the block when the linter changes instead of adding one", async () => {
    const { written } = await setUp(
      {
        "AGENTS.md": `# Team notes\n\n${rules}\n## Our own section\n\nKeep me.\n`,
      },
      ["codex"],
      "npm",
      "oxlint"
    );

    const output = written.get("AGENTS.md");
    expect(countHeaders(output)).toBe(1);
    expect(output).toContain("# Team notes");
    expect(output).toContain("fixed by Oxlint + Oxfmt.");
    expect(output).not.toContain("fixed by Biome.");
    expect(output).toContain("## Our own section\n\nKeep me.\n");
  });

  test("collapses duplicate blocks written by earlier versions", async () => {
    const { written } = await setUp(
      {
        "AGENTS.md": [
          "Intro",
          getRules("npm exec -- ultracite", "Biome"),
          getRules("npm exec -- ultracite", "Oxlint + Oxfmt"),
          getRules("bun x ultracite", "Oxlint + Oxfmt"),
        ].join("\n\n"),
      },
      ["codex"],
      "bun",
      "oxlint"
    );

    const output = written.get("AGENTS.md") ?? "";
    expect(countHeaders(output)).toBe(1);
    expect(output.startsWith("Intro\n\n# Ultracite Code Standards")).toBe(true);
    expect(output).toContain("`bunx ultracite fix`");
  });

  test("replaces the block of a CRLF file and keeps its line endings", async () => {
    const crlf = rules.replaceAll("\n", "\r\n");
    const { written } = await setUp(
      { "AGENTS.md": `Intro\r\n\r\n${crlf}` },
      ["codex"],
      "yarn"
    );

    const output = written.get("AGENTS.md") ?? "";
    expect(countHeaders(output)).toBe(1);
    expect(output).toContain("`yarn ultracite fix`");
    expect(output.replaceAll("\r\n", "")).not.toContain("\n");
  });

  test("leaves the file alone when the block is already current", async () => {
    const { written } = await setUp({ "AGENTS.md": `Intro\n\n${rules}` }, [
      "codex",
    ]);

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
});

describe("claude code", () => {
  test("needs only AGENTS.md in a project without a CLAUDE.md", async () => {
    const { written } = await setUp({}, ["claude"]);

    expect([...written.keys()]).toEqual(["AGENTS.md"]);
  });

  test("imports AGENTS.md from the project's CLAUDE.md", async () => {
    const { result, written } = await setUp(
      { "CLAUDE.md": "# Our project\n\nUse pnpm.\n" },
      ["claude"]
    );

    expect(written.get("CLAUDE.md")).toBe(
      "# Our project\n\nUse pnpm.\n\n@AGENTS.md\n"
    );
    expect(result.files).toEqual(["CLAUDE.md"]);
  });

  test("imports it with a relative path from .claude/CLAUDE.md", async () => {
    const { written } = await setUp({ ".claude/CLAUDE.md": "Use pnpm.\n" }, [
      "claude",
    ]);

    expect(written.get(".claude/CLAUDE.md")).toBe(
      "Use pnpm.\n\n@../AGENTS.md\n"
    );
  });

  test("leaves a CLAUDE.md that already imports AGENTS.md alone", async () => {
    const { written } = await setUp(
      { "CLAUDE.md": "@AGENTS.md\n\nUse pnpm.\n" },
      ["claude"]
    );

    expect(written.has("CLAUDE.md")).toBe(false);
  });

  test("removes the .claude/CLAUDE.md earlier versions wrote, which would hide AGENTS.md", async () => {
    const { result } = await setUp({ ".claude/CLAUDE.md": rules }, [
      "universal",
    ]);

    expect(removed.has(".claude/CLAUDE.md")).toBe(true);
    expect(result.files).toEqual([".claude/CLAUDE.md"]);
  });

  test("keeps the user's part of an old .claude/CLAUDE.md and imports AGENTS.md there", async () => {
    const { written } = await setUp(
      { ".claude/CLAUDE.md": `# Ours\n\nUse pnpm.\n\n${rules}` },
      ["universal"]
    );

    expect(removed.has(".claude/CLAUDE.md")).toBe(false);
    expect(written.get(".claude/CLAUDE.md")).toBe(
      "# Ours\n\nUse pnpm.\n\n@../AGENTS.md\n"
    );
  });
});

describe("replit", () => {
  test("gets a copy of the rules in replit.md", async () => {
    const { result, written } = await setUp(
      { "replit.md": "# Overview\n\nA todo app.\n" },
      ["replit"]
    );

    expect(written.get("AGENTS.md")).toBe(rules);
    expect(written.get("replit.md")).toBe(
      `# Overview\n\nA todo app.\n\n${rules}`
    );
    expect(result.files).toEqual(["replit.md"]);
  });
});

describe("gemini cli", () => {
  test("lists AGENTS.md in .gemini/settings.json, keeping GEMINI.md", async () => {
    const { written } = await setUp({}, ["gemini"]);

    expect(JSON.parse(written.get(".gemini/settings.json") ?? "{}")).toEqual({
      context: { fileName: ["GEMINI.md", "AGENTS.md"] },
    });
  });

  test("merges into existing settings", async () => {
    const { written } = await setUp(
      {
        ".gemini/settings.json":
          '{\n  // Ours\n  "theme": "Dracula",\n  "context": { "fileName": "CONTEXT.md" }\n}\n',
      },
      ["gemini"]
    );

    const output = written.get(".gemini/settings.json") ?? "";
    expect(output).toContain("// Ours");
    expect(output).toContain('"theme": "Dracula"');
    expect(output).toContain('"CONTEXT.md"');
    expect(output).toContain('"AGENTS.md"');
  });

  test("takes the rules out of the GEMINI.md earlier versions wrote", async () => {
    const { written } = await setUp({ "GEMINI.md": `Our notes.\n\n${rules}` }, [
      "universal",
    ]);

    expect(written.get("GEMINI.md")).toBe("Our notes.\n");
    expect(written.has(".gemini/settings.json")).toBe(true);
  });
});

describe("firebender", () => {
  test("needs only AGENTS.md", async () => {
    const { written } = await setUp({}, ["firebender"]);

    expect([...written.keys()]).toEqual(["AGENTS.md"]);
  });

  test("removes the rule file earlier versions wrote, frontmatter and all", async () => {
    await setUp(
      {
        ".firebender/rules/ultracite.mdc": `---\ndescription: Ultracite code standards for JavaScript and TypeScript\nalwaysApply: true\n---\n\n${rules}`,
        "firebender.json": rules,
      },
      ["universal"]
    );

    expect(removed.has(".firebender/rules/ultracite.mdc")).toBe(true);
    expect(removed.has("firebender.json")).toBe(true);
  });

  test("leaves a real firebender.json alone", async () => {
    const { written } = await setUp(
      { "firebender.json": '{"rules":["Use Kotlin"]}' },
      ["firebender"]
    );

    expect(written.has("firebender.json")).toBe(false);
    expect(removed.has("firebender.json")).toBe(false);
  });
});

describe("aider", () => {
  test("points .aider.conf.yml at AGENTS.md and lints each edit", async () => {
    const { written } = await setUp({}, ["aider"], "pnpm", "oxlint");

    expect(written.get("AGENTS.md")).toContain("# Ultracite Code Standards");
    expect(written.get(".aider.conf.yml")).toBe(
      "read: AGENTS.md\nlint-cmd: pnpm exec ultracite fix\n"
    );
  });

  test("merges into an existing .aider.conf.yml", async () => {
    const { written } = await setUp(
      { ".aider.conf.yml": "# Team settings\nmodel: sonnet\n" },
      ["aider"]
    );

    expect(written.get(".aider.conf.yml")).toBe(
      "# Team settings\nmodel: sonnet\nread: AGENTS.md\nlint-cmd: npx ultracite fix\n"
    );
  });

  test("removes the ultracite.md earlier versions wrote", async () => {
    await setUp(
      { ".aider.conf.yml": "read: ultracite.md\n", "ultracite.md": rules },
      ["aider"]
    );

    expect(removed.has("ultracite.md")).toBe(true);
  });

  test("keeps an ultracite.md that holds more than the rules", async () => {
    const { written } = await setUp(
      { "ultracite.md": `${rules}\n# Our notes\n\nKeep these.\n` },
      ["aider"]
    );

    expect(removed.has("ultracite.md")).toBe(false);
    expect(written.get("ultracite.md")).toBe("# Our notes\n\nKeep these.\n");
  });
});

describe("getAgentChoices", () => {
  test("offers AGENTS.md first, then the agents that need one more file", () => {
    const choices = getAgentChoices();

    expect(choices[0]).toEqual({
      id: "universal",
      promptLabel:
        "Universal (creates AGENTS.md for Codex, Jules, Devin, and more)",
    });
    expect(choices.map((choice) => choice.id)).toEqual([
      "universal",
      "claude",
      "replit",
      "aider",
      "gemini",
    ]);
    expect(choices.find((choice) => choice.id === "aider")?.promptLabel).toBe(
      "Aider (creates AGENTS.md and .aider.conf.yml)"
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
    const mkdirSync = mockEscapingDirectory(".gemini");

    try {
      await expect(writeAgentFiles(["gemini"], "npm", "biome")).rejects.toThrow(
        "Refusing to write"
      );
      expect(mkdirSync).not.toHaveBeenCalled();
    } finally {
      restoreFileSystemMock();
    }
  });
});
