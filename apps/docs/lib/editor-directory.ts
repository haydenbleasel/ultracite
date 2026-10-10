// What the /editors pages say about each editor `ultracite init` configures.
// The CLI's table (packages/cli/src/data/editors.ts) decides which editors
// exist and which files and extensions they get; this adds who makes each
// one and what it is, checked against each product's own docs on 2026-10-10.

export interface EditorEntry {
  /**
   * The CLI id of the agent page that covers this editor's built-in agent,
   * when there is one.
   */
  agent?: string;
  /** File in public/logos, when it isn't named after the id. */
  logo?: string;
  maker: string;
  name: string;
  /** One factual sentence: what it is. */
  tagline: string;
}

export const editorDirectory = {
  antigravity: {
    agent: "antigravity",
    maker: "Google",
    name: "Antigravity IDE",
    tagline:
      "Google’s AI code editor, built on Code OSS, and a separate app from the Antigravity 2.0 agent manager since May 2026.",
  },
  bob: {
    agent: "bob",
    maker: "IBM",
    name: "IBM Bob",
    tagline:
      "IBM’s AI development IDE, built on VS Code, with mode-based agents and the Bob Shell CLI.",
  },
  codebuddy: {
    maker: "Tencent",
    name: "CodeBuddy",
    tagline:
      "Tencent’s AI IDE, built on VS Code, with a built-in agent and plugins for other editors.",
  },
  cursor: {
    agent: "cursor-cli",
    maker: "Anysphere",
    name: "Cursor",
    tagline:
      "The AI code editor built on VS Code, with an agent that edits across your codebase.",
  },
  devin: {
    agent: "devin",
    logo: "devin",
    maker: "Cognition",
    name: "Devin Desktop",
    tagline:
      "Cognition’s AI IDE, formerly Windsurf, built on Code OSS, with the Devin Local agent.",
  },
  kiro: {
    agent: "kiro-cli",
    maker: "AWS",
    name: "Kiro",
    tagline:
      "AWS’s spec-driven AI IDE, built on Code OSS, with steering files and agent hooks.",
  },
  trae: {
    maker: "ByteDance",
    name: "Trae",
    tagline:
      "ByteDance’s AI IDE, built on VS Code, with an Agent window beside the IDE window since October 2026.",
  },
  void: {
    maker: "Glass Devtools",
    name: "Void",
    tagline:
      "An open-source AI code editor built on VS Code 1.99, now archived; its last release shipped in June 2025.",
  },
  vscode: {
    agent: "copilot",
    maker: "Microsoft",
    name: "VS Code",
    tagline:
      "Microsoft’s code editor, with GitHub Copilot’s agent built in and extensions from the Visual Studio Marketplace.",
  },
  zed: {
    maker: "Zed Industries",
    name: "Zed",
    tagline:
      "A native editor written in Rust, with its own agent and others over the Agent Client Protocol.",
  },
} satisfies Record<string, EditorEntry>;
