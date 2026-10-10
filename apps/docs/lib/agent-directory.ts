// What the /agents index says about each agent `ultracite init` supports.
// The CLI's table (packages/cli/src/data/agents.ts) decides which agents
// exist and which files they get; this adds who makes each one and what it
// is, checked against each product's own docs on 2026-10-10.

export type AgentGroup = "cloud" | "editor" | "framework" | "terminal";

export interface AgentEntry {
  group: AgentGroup;
  /** File in public/logos, when it isn't named after the id. */
  logo?: string;
  maker: string;
  name: string;
  /** One factual sentence: what it is and where it runs. */
  tagline: string;
}

export const agentDirectory = {
  adal: {
    group: "terminal",
    maker: "SylphAI",
    name: "AdaL",
    tagline:
      "SylphAI’s terminal coding agent, also available as a desktop app.",
  },
  aider: {
    group: "terminal",
    maker: "Aider-AI",
    name: "Aider",
    tagline:
      "Terminal pair programmer that commits each change. Add `ultracite.md` to `read:` in `.aider.conf.yml` so it loads the rules.",
  },
  amp: {
    group: "terminal",
    maker: "Amp",
    name: "Amp",
    tagline:
      "Coding agent that runs in your terminal or on per-thread cloud machines.",
  },
  augmentcode: {
    group: "editor",
    maker: "Augment Code",
    name: "Augment Code",
    tagline:
      "Coding agent for VS Code and JetBrains, plus the Auggie CLI, built on a codebase context engine.",
  },
  bob: {
    group: "editor",
    maker: "IBM",
    name: "IBM Bob",
    tagline:
      "IBM’s AI development IDE, with the Bob Shell CLI and mode-based agents.",
  },
  claude: {
    group: "terminal",
    maker: "Anthropic",
    name: "Claude Code",
    tagline:
      "Anthropic’s agentic coding tool that edits files and runs commands from your terminal, IDE or desktop.",
  },
  cline: {
    group: "editor",
    maker: "Cline",
    name: "Cline",
    tagline:
      "Open-source coding agent for VS Code, also shipped as a CLI and an SDK.",
  },
  codex: {
    group: "terminal",
    maker: "OpenAI",
    name: "Codex",
    tagline:
      "OpenAI’s coding agent for the terminal, IDEs, the ChatGPT desktop app and cloud tasks.",
  },
  copilot: {
    group: "editor",
    maker: "GitHub",
    name: "GitHub Copilot",
    tagline:
      "GitHub’s coding assistant: agent mode in editors, a CLI, and a cloud agent that opens pull requests.",
  },
  crush: {
    group: "terminal",
    maker: "Charm",
    name: "Crush",
    tagline:
      "Charm’s terminal coding agent that works with many model providers, with LSP context and MCP.",
  },
  "cursor-cli": {
    group: "terminal",
    logo: "cursor",
    maker: "Anysphere",
    name: "Cursor CLI",
    tagline: "The Cursor agent in your terminal, interactive or headless.",
  },
  deepagents: {
    group: "framework",
    logo: "langchain",
    maker: "LangChain",
    name: "Deep Agents",
    tagline:
      "LangChain’s open-source agent harness on LangGraph, with the dcode terminal coding agent.",
  },
  devin: {
    group: "cloud",
    maker: "Cognition",
    name: "Devin",
    tagline:
      "Cognition’s autonomous coding agent, in cloud sessions, a CLI and a desktop app.",
  },
  droid: {
    group: "terminal",
    maker: "Factory",
    name: "Droid",
    tagline: "Factory’s coding agent CLI, run interactively or headless in CI.",
  },
  firebender: {
    group: "editor",
    maker: "Firebender",
    name: "Firebender",
    tagline:
      "Coding agent for Android Studio and other JetBrains IDEs, focused on Android.",
  },
  gemini: {
    group: "terminal",
    maker: "Google",
    name: "Gemini CLI",
    tagline:
      "Google’s open-source terminal agent for Gemini models, now for paid API and enterprise users.",
  },
  goose: {
    group: "terminal",
    maker: "Agentic AI Foundation",
    name: "goose",
    tagline:
      "Open-source local agent with a desktop app and a CLI, created by Block.",
  },
  jules: {
    group: "cloud",
    maker: "Google",
    name: "Jules",
    tagline:
      "Google’s asynchronous agent that works on your repo in a cloud VM and opens pull requests.",
  },
  junie: {
    group: "editor",
    maker: "JetBrains",
    name: "Junie",
    tagline: "JetBrains’ coding agent for its IDEs, the terminal and CI.",
  },
  "kilo-code": {
    group: "editor",
    maker: "Kilo Code",
    name: "Kilo Code",
    tagline:
      "Open-source coding agent for VS Code, JetBrains and the terminal.",
  },
  "kimi-cli": {
    group: "terminal",
    logo: "kimi",
    maker: "Moonshot AI",
    name: "Kimi Code CLI",
    tagline:
      "Moonshot AI’s terminal agent that edits code and runs shell commands.",
  },
  "kiro-cli": {
    group: "terminal",
    logo: "kiro",
    maker: "Amazon Web Services",
    name: "Kiro CLI",
    tagline:
      "AWS’s terminal coding agent, formerly Amazon Q Developer CLI, with custom agents, steering and hooks.",
  },
  lovable: {
    group: "cloud",
    maker: "Lovable",
    name: "Lovable",
    tagline:
      "Browser-based app builder where an agent writes full-stack web apps from chat.",
  },
  "mistral-vibe": {
    group: "terminal",
    logo: "mistral",
    maker: "Mistral AI",
    name: "Mistral Vibe",
    tagline:
      "Mistral AI’s open-source terminal coding agent, also usable in editors over ACP.",
  },
  ona: {
    group: "cloud",
    maker: "OpenAI",
    name: "Ona",
    tagline:
      "Background coding agents in cloud dev environments, formerly Gitpod and now part of OpenAI.",
  },
  "open-hands": {
    group: "cloud",
    maker: "All Hands AI",
    name: "OpenHands",
    tagline:
      "Open-source agent platform with a GUI, CLI, SDK and cloud that runs agents in sandboxes.",
  },
  openclaw: {
    group: "terminal",
    maker: "OpenClaw Foundation",
    name: "OpenClaw",
    tagline:
      "Self-hosted open-source assistant that runs on your machine and takes tasks from chat apps.",
  },
  opencode: {
    group: "terminal",
    maker: "Anomaly",
    name: "OpenCode",
    tagline:
      "Open-source coding agent for the terminal, desktop and IDEs, with 75+ model providers.",
  },
  pi: {
    group: "terminal",
    maker: "Earendil",
    name: "Pi",
    tagline:
      "Minimal open-source terminal agent you extend with TypeScript extensions and skills.",
  },
  qoder: {
    group: "editor",
    maker: "Alibaba",
    name: "Qoder",
    tagline:
      "Alibaba’s agentic coding platform: a desktop IDE, a JetBrains plugin and a CLI.",
  },
  qwen: {
    group: "terminal",
    maker: "Alibaba Cloud",
    name: "Qwen Code",
    tagline:
      "The Qwen team’s open-source terminal coding agent, with editor and desktop front ends.",
  },
  replit: {
    group: "cloud",
    maker: "Replit",
    name: "Replit Agent",
    tagline:
      "Replit’s in-browser agent that builds, runs and deploys apps from prompts.",
  },
  "snowflake-cortex": {
    group: "terminal",
    logo: "snowflake",
    maker: "Snowflake",
    name: "Snowflake CoCo",
    tagline:
      "Snowflake’s data-focused coding agent, formerly Cortex Code, as a CLI, a desktop app and in Snowsight.",
  },
  vercel: {
    group: "cloud",
    maker: "Vercel",
    name: "Vercel Agent",
    tagline:
      "Vercel’s agent that reviews pull requests and investigates production issues.",
  },
  warp: {
    group: "editor",
    maker: "Warp",
    name: "Warp",
    tagline:
      "Terminal-based development environment with a built-in coding agent and cloud agents.",
  },
  xum: {
    group: "editor",
    logo: "coder",
    maker: "Coder",
    name: "Xum",
    tagline:
      "Coder’s desktop app, formerly Mux, for running agents in parallel, isolated workspaces.",
  },
  zencoder: {
    group: "editor",
    maker: "Zencoder",
    name: "Zencoder",
    tagline:
      "Coding agent for VS Code and JetBrains, with the Zenflow desktop app and a CLI.",
  },
} satisfies Record<string, AgentEntry>;

export const agentGroups: {
  description: string;
  id: AgentGroup;
  title: string;
}[] = [
  {
    description:
      "CLIs and TUIs that read your repo, edit files and run commands.",
    id: "terminal",
    title: "In the terminal",
  },
  {
    description:
      "Agents inside VS Code, JetBrains IDEs and their own desktop apps.",
    id: "editor",
    title: "In the editor",
  },
  {
    description:
      "Agents that work on your repo remotely and hand back a pull request or an app.",
    id: "cloud",
    title: "In the cloud",
  },
  {
    description: "Toolkits for building your own coding agent.",
    id: "framework",
    title: "Frameworks",
  },
];
