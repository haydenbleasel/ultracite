import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAgents } from "../src/agents/index";
import { exists } from "../src/utils";

vi.mock("node:fs/promises");
vi.mock("../src/utils");

describe("agents/index", () => {
  const mockMkdir = vi.mocked(mkdir);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
  });

    describe("createAgents", () => {
      describe("without frameworks", () => {
        it("should create Cursor hooks configuration", async () => {
          mockExists.mockResolvedValue(false);
          mockWriteFile.mockResolvedValue();
          mockMkdir.mockResolvedValue(undefined);

          const agent = createAgents("cursor");
          const existsResult = await agent.exists();
          await agent.create();

          expect(existsResult).toBe(false);
          expect(mockExists).toHaveBeenCalledWith("./.cursor/rules/ultracite.mdc");
          expect(mockMkdir).toHaveBeenCalledWith(".cursor/rules", {
            recursive: true,
          });

          // Should write both the rules file and hooks file
          expect(mockWriteFile).toHaveBeenCalledTimes(2);

          // First call writes the rules file
          expect(mockWriteFile).toHaveBeenNthCalledWith(
            1,
            "./.cursor/rules/ultracite.mdc",
            expect.any(String)
          );

          // Second call writes the hooks file
          expect(mockWriteFile).toHaveBeenNthCalledWith(
            2,
            "./.cursor/hooks.json",
            expect.stringContaining('"afterFileEdit"')
          );

          const [, hooksContent] = mockWriteFile.mock.calls[1];
          const parsed = JSON.parse(hooksContent as string);
          expect(parsed).toEqual({
            version: 1,
            hooks: {
              afterFileEdit: [{ command: "npx ultracite fix" }],
            },
          });
        });

      it("should create agents for windsurf without header", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf");
        await agent.create();

        expect(mockMkdir).toHaveBeenCalledWith(".windsurf/rules", {
          recursive: true,
        });
        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall[0]).toBe("./.windsurf/rules/ultracite.md");
        // Should start with # Ultracite, not with --- frontmatter
        expect(writeCall[1]).toMatch(/^# Ultracite/);
      });

      it("should create agents for vscode-copilot in append mode", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("vscode-copilot");
        await agent.create();

        expect(mockMkdir).toHaveBeenCalledWith(".github", { recursive: true });
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.github/copilot-instructions.md",
          expect.stringContaining('applyTo: "**/*.{ts,tsx,js,jsx}"')
        );
      });

      it("should create agents for zed with append mode", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();

        const agent = createAgents("zed");
        await agent.create();

        // .rules is in current directory, so no mkdir should be called
        expect(mockMkdir).not.toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.rules",
          expect.any(String)
        );
      });

      it("should create agents for claude", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("claude");
        await agent.create();

        expect(mockMkdir).toHaveBeenCalledWith(".claude", { recursive: true });
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.claude/CLAUDE.md",
          expect.any(String)
        );
      });

      it("should create agents for codex", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();

        const agent = createAgents("codex");
        await agent.create();

        expect(mockMkdir).not.toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./AGENTS.md",
          expect.any(String)
        );
      });

      it("should create agents for kiro", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("kiro");
        await agent.create();

        expect(mockMkdir).toHaveBeenCalledWith(".kiro/steering", {
          recursive: true,
        });
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.kiro/steering/ultracite.md",
          expect.any(String)
        );
      });

      it("should create agents for cline", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();

        const agent = createAgents("cline");
        await agent.create();

        expect(mockMkdir).not.toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.clinerules",
          expect.any(String)
        );
      });

      it("should create agents for amp", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();

        const agent = createAgents("amp");
        await agent.create();

        expect(mockMkdir).not.toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./AGENT.md",
          expect.any(String)
        );
      });

      it("should create agents for aider", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();

        const agent = createAgents("aider");
        await agent.create();

        expect(mockMkdir).not.toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./ultracite.md",
          expect.any(String)
        );
      });

      it("should create agents for firebase-studio", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("firebase-studio");
        await agent.create();

        expect(mockMkdir).toHaveBeenCalledWith(".idx", { recursive: true });
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.idx/airules.md",
          expect.any(String)
        );
      });

      it("should create agents for open-hands", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("open-hands");
        await agent.create();

        expect(mockMkdir).toHaveBeenCalledWith(".openhands/microagents", {
          recursive: true,
        });
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.openhands/microagents/repo.md",
          expect.any(String)
        );
      });

      it("should create agents for gemini-cli", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();

        const agent = createAgents("gemini-cli");
        await agent.create();

        expect(mockMkdir).not.toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./GEMINI.md",
          expect.any(String)
        );
      });

      it("should create agents for junie", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("junie");
        await agent.create();

        expect(mockMkdir).toHaveBeenCalledWith(".junie", { recursive: true });
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.junie/guidelines.md",
          expect.any(String)
        );
      });

      it("should create agents for augmentcode", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("augmentcode");
        await agent.create();

        expect(mockMkdir).toHaveBeenCalledWith(".augment/rules", {
          recursive: true,
        });
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.augment/rules/ultracite.md",
          expect.any(String)
        );
      });

      it("should create agents for kilo-code", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("kilo-code");
        await agent.create();

        expect(mockMkdir).toHaveBeenCalledWith(".kilocode/rules", {
          recursive: true,
        });
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.kilocode/rules/ultracite.md",
          expect.any(String)
        );
      });

      it("should create agents for goose", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();

        const agent = createAgents("goose");
        await agent.create();

        expect(mockMkdir).not.toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.goosehints",
          expect.any(String)
        );
      });

      it("should create agents for roo-code", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("roo-code");
        await agent.create();

        expect(mockMkdir).toHaveBeenCalledWith(".roo/rules", {
          recursive: true,
        });
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.roo/rules/ultracite.md",
          expect.any(String)
        );
      });

      it("should create agents for warp", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();

        const agent = createAgents("warp");
        await agent.create();

        expect(mockMkdir).not.toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./WARP.md",
          expect.any(String)
        );
      });

      it("should return true when agent file exists", async () => {
        mockExists.mockResolvedValue(true);

        const agent = createAgents("cursor");
        const result = await agent.exists();

        expect(result).toBe(true);
        expect(mockExists).toHaveBeenCalledWith("./.cursor/rules/ultracite.mdc");
      });
    });

    describe("with frameworks", () => {
      it("should include react rules when react framework is specified", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf", ["react"]);
        await agent.create();

        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.windsurf/rules/ultracite.md",
          expect.stringMatching(/react/i)
        );
      });

      it("should include next rules when next framework is specified", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf", ["next"]);
        await agent.create();

        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall).toBeDefined();
        expect(writeCall[1]).toContain("Ultracite Code Standards");
        expect(writeCall[1]).toContain("Next.js");
      });

      it("should include qwik rules when qwik framework is specified", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf", ["qwik"]);
        await agent.create();

        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall).toBeDefined();
        expect(writeCall[1]).toContain("Ultracite Code Standards");
        expect(writeCall[1]).toContain("Qwik");
      });

      it("should include solid rules when solid framework is specified", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf", ["solid"]);
        await agent.create();

        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall).toBeDefined();
        expect(writeCall[1]).toContain("Ultracite Code Standards");
        expect(writeCall[1]).toContain("Solid");
      });

      it("should include svelte rules when svelte framework is specified", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf", ["svelte"]);
        await agent.create();

        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall).toBeDefined();
        expect(writeCall[1]).toContain("Ultracite Code Standards");
        expect(writeCall[1]).toContain("Svelte");
      });

      it("should include vue rules when vue framework is specified", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf", ["vue"]);
        await agent.create();

        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall).toBeDefined();
        expect(writeCall[1]).toContain("Ultracite Code Standards");
        expect(writeCall[1]).toContain("Vue");
      });

      it("should include angular rules when angular framework is specified", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf", ["angular"]);
        await agent.create();

        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall).toBeDefined();
        // Angular has no specific rules yet, so just verify it doesn't error
        expect(writeCall[1]).toContain("Ultracite Code Standards");
      });

      it("should include remix rules when remix framework is specified", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf", ["remix"]);
        await agent.create();

        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall).toBeDefined();
        // Remix has no specific rules yet, so just verify it doesn't error
        expect(writeCall[1]).toContain("Ultracite Code Standards");
      });

      it("should include astro rules when astro framework is specified", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf", ["astro"]);
        await agent.create();

        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall).toBeDefined();
        expect(writeCall[1]).toContain("Ultracite Code Standards");
      });

      it("should include multiple framework rules when multiple frameworks are specified", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf", ["react", "next", "vue"]);
        await agent.create();

        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall).toBeDefined();
        expect(writeCall[1]).toMatch(/react/i);
        expect(writeCall[1]).toContain("Next.js");
        expect(writeCall[1]).toContain("Vue");
      });
    });

    describe("update method", () => {
      it("should overwrite file for non-append mode agents", async () => {
        mockExists.mockResolvedValue(true);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf");
        await agent.update();

        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.windsurf/rules/ultracite.md",
          expect.any(String)
        );
      });

      it("should create file when it does not exist for non-append mode agents", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("windsurf", ["react"]);
        await agent.update();

        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.windsurf/rules/ultracite.md",
          expect.stringContaining("React")
        );
      });

      it("should append rules when file exists and rules are not present", async () => {
        mockExists.mockResolvedValue(true);
        mockReadFile.mockResolvedValue("# Existing content\n\nSome rules");
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("zed");
        await agent.update();

        expect(mockReadFile).toHaveBeenCalledWith("./.rules", "utf-8");
        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall).toBeDefined();
        expect(writeCall[1]).toContain("# Existing content");
        expect(writeCall[1]).toContain("Ultracite Code Standards");
      });

      it("should not append rules when they already exist", async () => {
        // First write to get the actual rules content
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("zed");
        await agent.create();

        // Get the actual written content
        const writtenContent = mockWriteFile.mock.calls[0][1] as string;

        // Now test the update scenario with existing content
        vi.clearAllMocks();
        mockExists.mockResolvedValue(true);
        mockReadFile.mockResolvedValue(`# Existing content\n\n${writtenContent}`);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        await agent.update();

        expect(mockReadFile).toHaveBeenCalledWith("./.rules", "utf-8");
        expect(mockWriteFile).not.toHaveBeenCalled();
      });

      it("should create directory when updating in append mode", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("vscode-copilot");
        await agent.update();

        expect(mockMkdir).toHaveBeenCalledWith(".github", { recursive: true });
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.github/copilot-instructions.md",
          expect.any(String)
        );
      });

      it("should handle leading ./ in directory paths", async () => {
        mockExists.mockResolvedValue(false);
        mockReadFile.mockResolvedValue(
          JSON.stringify({
            version: 1,
            hooks: { afterFileEdit: [] },
          })
        );
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("cursor");
        await agent.update();

        // Should strip leading ./ from directory path
        expect(mockMkdir).toHaveBeenCalledWith(".cursor/rules", {
          recursive: true,
        });

        // Should write both the rules file and hooks file
        expect(mockWriteFile).toHaveBeenCalledTimes(2);

        // First call writes the rules file
        expect(mockWriteFile).toHaveBeenNthCalledWith(
          1,
          "./.cursor/rules/ultracite.mdc",
          expect.any(String)
        );

        // Second call writes the hooks file
        expect(mockWriteFile).toHaveBeenNthCalledWith(
          2,
          "./.cursor/hooks.json",
          expect.stringContaining('"afterFileEdit"')
        );
      });

      it("should not create directory when path is current directory", async () => {
        mockExists.mockResolvedValue(false);
        mockWriteFile.mockResolvedValue();

        const agent = createAgents("zed");
        await agent.update();

        expect(mockMkdir).not.toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.rules",
          expect.any(String)
        );
      });

      it("should append Cursor hook when hooks file exists without Ultracite command", async () => {
        mockExists.mockResolvedValue(true);
        mockReadFile.mockResolvedValue(
          JSON.stringify({
            version: 1,
            hooks: { afterFileEdit: [{ command: "echo hi" }] },
          })
        );
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("cursor");
        await agent.update();

        expect(mockReadFile).toHaveBeenCalledWith(
          "./.cursor/hooks.json",
          "utf-8"
        );

        // Should write both the rules file and hooks file
        expect(mockWriteFile).toHaveBeenCalledTimes(2);

        // Second call writes the hooks file with the new hook appended
        const [, hooksWritten] = mockWriteFile.mock.calls[1];
        const parsed = JSON.parse(hooksWritten as string);
        expect(parsed.hooks.afterFileEdit).toEqual([
          { command: "echo hi" },
          { command: "npx ultracite fix" },
        ]);
      });

      it("should not duplicate Cursor hook when Ultracite command already exists", async () => {
        mockExists.mockResolvedValue(true);
        mockReadFile.mockResolvedValue(
          JSON.stringify({
            version: 2,
            hooks: { afterFileEdit: [{ command: "npx ultracite fix" }] },
          })
        );
        mockWriteFile.mockResolvedValue();
        mockMkdir.mockResolvedValue(undefined);

        const agent = createAgents("cursor");
        await agent.update();

        expect(mockReadFile).toHaveBeenCalledWith(
          "./.cursor/hooks.json",
          "utf-8"
        );

        // Should only write the rules file (1 call), not the hooks file
        expect(mockWriteFile).toHaveBeenCalledTimes(1);
        expect(mockWriteFile).toHaveBeenCalledWith(
          "./.cursor/rules/ultracite.mdc",
          expect.any(String)
        );
      });
    });
  });
});
