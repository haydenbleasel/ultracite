import type { StaticImageData } from "next/image";
import aiderLogo from "../logos/aider.svg";
import amazonQLogo from "../logos/amazon-q.svg";
import ampLogo from "../logos/amp.svg";
import antigravityLogo from "../logos/antigravity.svg";
import augmentcodeLogo from "../logos/augmentcode.svg";
import claudeLogo from "../logos/claude.svg";
import clineLogo from "../logos/cline.svg";
import codexLogo from "../logos/codex.svg";
import vscodeCopilotLogo from "../logos/copilot.svg";
import crushLogo from "../logos/crush.svg";
import cursorLogo from "../logos/cursor.svg";
import droidLogo from "../logos/droid.svg";
import firebenderLogo from "../logos/firebender.svg";
import firebaseStudioLogo from "../logos/firebase-studio.svg";
import geminiLogo from "../logos/gemini.svg";
import gooseLogo from "../logos/goose.svg";
import julesLogo from "../logos/jules.svg";
import junieLogo from "../logos/junie.svg";
import kiloCodeLogo from "../logos/kilo-code.svg";
import kiroLogo from "../logos/kiro.svg";
import opencodeLogo from "../logos/opencode.svg";
import openHandsLogo from "../logos/open-hands.svg";
import qwenLogo from "../logos/qwen.svg";
import rooCodeLogo from "../logos/roo-code.svg";
import traeLogo from "../logos/trae.svg";
import warpLogo from "../logos/warp.svg";
import windsurfLogo from "../logos/windsurf.svg";
import zedLogo from "../logos/zed.svg";

export type AgentCategory = "ide" | "cli" | "cloud" | "extension";

export interface AgentConfig {
  /** Header content to prepend to the rules file (e.g., frontmatter) */
  header?: string;
  /** Whether to append to existing file instead of replacing */
  appendMode?: boolean;
}

export interface Agent {
  /** Unique identifier for the agent */
  id: string;
  /** Display name */
  name: string;
  /** Short tagline for navbar */
  subtitle: string;
  /** Full description */
  description: string;
  /** Path to the config file the CLI creates */
  configPath: string;
  /** Agent's website URL */
  website: string;
  /** Category of the agent */
  category: AgentCategory;
  /** Key features of the agent */
  features: string[];
  /** CLI configuration */
  config: AgentConfig;
  /** Logo for UI display */
  logo: StaticImageData;
}

export const agents: Agent[] = [
  {
    id: "claude",
    name: "Claude Code",
    subtitle: "Anthropic's agentic CLI",
    description:
      "Anthropic's official CLI for Claude, an agentic coding tool that lives in your terminal.",
    configPath: ".claude/CLAUDE.md",
    website: "https://claude.ai/code",
    category: "cli",
    features: [
      "Agentic coding assistant",
      "Terminal-based workflow",
      "Context-aware suggestions",
      "Multi-file editing",
    ],
    config: {
      appendMode: true,
    },
    logo: claudeLogo,
  },
  {
    id: "codex",
    name: "Codex",
    subtitle: "OpenAI's coding agent",
    description:
      "OpenAI's cloud-based coding agent for autonomous software development tasks.",
    configPath: "AGENTS.md",
    website: "https://openai.com/codex",
    category: "cloud",
    features: [
      "Cloud-based execution",
      "Autonomous coding",
      "GitHub integration",
      "Async task handling",
    ],
    config: {
      appendMode: true,
    },
    logo: codexLogo,
  },
  {
    id: "jules",
    name: "Jules",
    subtitle: "Google's async agent",
    description:
      "Google's asynchronous AI coding agent that works in the background to complete development tasks.",
    configPath: "AGENTS.md",
    website: "https://jules.google.com",
    category: "cloud",
    features: [
      "Async task execution",
      "Background processing",
      "GitHub integration",
      "Multi-file changes",
    ],
    config: {
      appendMode: true,
    },
    logo: julesLogo,
  },
  {
    id: "cursor",
    name: "Cursor",
    subtitle: "The AI-first code editor",
    description:
      "The AI-first code editor built on VS Code with deep AI integration for coding assistance.",
    configPath: ".cursor/rules/ultracite.mdc",
    website: "https://cursor.com",
    category: "ide",
    features: [
      "AI-native editor",
      "Inline completions",
      "Chat interface",
      "Codebase understanding",
    ],
    config: {
      header: `---
description: Ultracite Rules - AI-Ready Formatter and Linter
globs: "**/*.{ts,tsx,js,jsx,json,jsonc,html,vue,svelte,astro,css,yaml,yml,graphql,gql,md,mdx,grit}"
alwaysApply: false
---`,
    },
    logo: cursorLogo,
  },
  {
    id: "windsurf",
    name: "Windsurf",
    subtitle: "The agentic IDE by Codeium",
    description:
      "Codeium's agentic IDE that combines AI assistance with a powerful development environment.",
    configPath: ".windsurf/rules/ultracite.md",
    website: "https://codeium.com/windsurf",
    category: "ide",
    features: [
      "Agentic workflows",
      "Cascade AI system",
      "Real-time collaboration",
      "Multi-file editing",
    ],
    config: {},
    logo: windsurfLogo,
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    subtitle: "GitHub's AI pair programmer",
    description:
      "GitHub's AI pair programmer that suggests code completions and helps write code faster.",
    configPath: ".github/copilot-instructions.md",
    website: "https://github.com/features/copilot",
    category: "extension",
    features: [
      "Code completions",
      "Chat interface",
      "PR summaries",
      "Documentation generation",
    ],
    config: {
      header: `---
applyTo: "**/*.{ts,tsx,js,jsx}"
---`,
      appendMode: true,
    },
    logo: vscodeCopilotLogo,
  },
  {
    id: "zed",
    name: "Zed",
    subtitle: "High-performance editor",
    description:
      "A high-performance, multiplayer code editor with built-in AI assistance.",
    configPath: ".rules",
    website: "https://zed.dev",
    category: "ide",
    features: [
      "Lightning fast",
      "Collaborative editing",
      "Built-in AI assistant",
      "GPU-accelerated",
    ],
    config: {
      appendMode: true,
    },
    logo: zedLogo,
  },
  {
    id: "kiro",
    name: "Kiro",
    subtitle: "AWS's spec-driven IDE",
    description:
      "AWS's spec-driven AI development environment for building production-ready applications.",
    configPath: ".kiro/steering/ultracite.md",
    website: "https://kiro.dev",
    category: "ide",
    features: [
      "Spec-driven development",
      "AWS integration",
      "Automated testing",
      "Production-ready output",
    ],
    config: {},
    logo: kiroLogo,
  },
  {
    id: "cline",
    name: "Cline",
    subtitle: "Autonomous VS Code agent",
    description:
      "An autonomous coding agent for VS Code that can create and edit files, run commands, and more.",
    configPath: ".clinerules",
    website: "https://cline.bot",
    category: "extension",
    features: [
      "Autonomous execution",
      "File management",
      "Command execution",
      "Human-in-the-loop",
    ],
    config: {
      appendMode: true,
    },
    logo: clineLogo,
  },
  {
    id: "amp",
    name: "AMP",
    subtitle: "Sourcegraph's coding agent",
    description:
      "Sourcegraph's AI coding agent that understands your entire codebase for intelligent assistance.",
    configPath: "AGENT.md",
    website: "https://sourcegraph.com/amp",
    category: "cli",
    features: [
      "Codebase-wide context",
      "Code search integration",
      "Multi-repo support",
      "Enterprise ready",
    ],
    config: {
      appendMode: true,
    },
    logo: ampLogo,
  },
  {
    id: "aider",
    name: "Aider",
    subtitle: "Terminal pair programming",
    description:
      "AI pair programming in your terminal with support for multiple LLM providers.",
    configPath: "ultracite.md",
    website: "https://aider.chat",
    category: "cli",
    features: [
      "Multi-LLM support",
      "Git integration",
      "Voice coding",
      "Pair programming",
    ],
    config: {},
    logo: aiderLogo,
  },
  {
    id: "firebase-studio",
    name: "Firebase Studio",
    subtitle: "Google's cloud IDE",
    description:
      "Google's AI-powered development environment integrated with Firebase services.",
    configPath: ".idx/airules.md",
    website: "https://firebase.google.com",
    category: "cloud",
    features: [
      "Firebase integration",
      "Cloud-based IDE",
      "AI assistance",
      "Instant deployment",
    ],
    config: {
      appendMode: true,
    },
    logo: firebaseStudioLogo,
  },
  {
    id: "open-hands",
    name: "OpenHands",
    subtitle: "Open-source AI agents",
    description:
      "An open-source platform for AI software development agents with autonomous capabilities.",
    configPath: ".openhands/microagents/repo.md",
    website: "https://all-hands.dev",
    category: "cloud",
    features: [
      "Open source",
      "Autonomous agents",
      "Self-hosted option",
      "Extensible platform",
    ],
    config: {
      appendMode: true,
    },
    logo: openHandsLogo,
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    subtitle: "Google's terminal AI",
    description:
      "Google's command-line interface for Gemini, bringing AI assistance to your terminal.",
    configPath: "GEMINI.md",
    website: "https://github.com/google-gemini/gemini-cli",
    category: "cli",
    features: [
      "Terminal-based",
      "Gemini models",
      "Shell integration",
      "Context awareness",
    ],
    config: {
      appendMode: true,
    },
    logo: geminiLogo,
  },
  {
    id: "junie",
    name: "Junie",
    subtitle: "JetBrains' AI agent",
    description:
      "JetBrains' AI coding agent integrated into their IDE ecosystem.",
    configPath: ".junie/guidelines.md",
    website: "https://jetbrains.com/junie",
    category: "ide",
    features: [
      "JetBrains integration",
      "Autonomous coding",
      "IDE-native experience",
      "Multi-language support",
    ],
    config: {
      appendMode: true,
    },
    logo: junieLogo,
  },
  {
    id: "augmentcode",
    name: "Augment Code",
    subtitle: "Enterprise AI assistant",
    description:
      "An AI coding assistant focused on enterprise development workflows and team collaboration.",
    configPath: ".augment/rules/ultracite.md",
    website: "https://augmentcode.com",
    category: "extension",
    features: [
      "Enterprise focus",
      "Team collaboration",
      "Context retention",
      "Security-first",
    ],
    config: {},
    logo: augmentcodeLogo,
  },
  {
    id: "kilo-code",
    name: "Kilo Code",
    subtitle: "Customizable VS Code AI",
    description:
      "A VS Code extension providing AI-powered coding assistance with customizable rules.",
    configPath: ".kilocode/rules/ultracite.md",
    website: "https://kilocode.ai",
    category: "extension",
    features: [
      "VS Code extension",
      "Customizable rules",
      "Local-first",
      "Privacy focused",
    ],
    config: {},
    logo: kiloCodeLogo,
  },
  {
    id: "goose",
    name: "Codename Goose",
    subtitle: "Block's open-source agent",
    description:
      "Block's open-source AI developer agent for autonomous software development.",
    configPath: ".goosehints",
    website: "https://block.github.io/goose",
    category: "cli",
    features: [
      "Open source",
      "Autonomous execution",
      "Tool extensibility",
      "Multi-provider support",
    ],
    config: {
      appendMode: true,
    },
    logo: gooseLogo,
  },
  {
    id: "roo-code",
    name: "Roo Code",
    subtitle: "Codebase navigation AI",
    description:
      "An AI coding assistant focused on understanding and navigating complex codebases.",
    configPath: ".roo/rules/ultracite.md",
    website: "https://roo.dev",
    category: "extension",
    features: [
      "Codebase navigation",
      "Context understanding",
      "VS Code integration",
      "Smart completions",
    ],
    config: {
      appendMode: true,
    },
    logo: rooCodeLogo,
  },
  {
    id: "warp",
    name: "Warp",
    subtitle: "Modern AI terminal",
    description:
      "A modern terminal with AI-powered command suggestions and workflow automation.",
    configPath: "WARP.md",
    website: "https://warp.dev",
    category: "cli",
    features: [
      "Modern terminal",
      "AI commands",
      "Workflow automation",
      "Team collaboration",
    ],
    config: {
      appendMode: true,
    },
    logo: warpLogo,
  },
  {
    id: "droid",
    name: "Droid",
    subtitle: "Automated code generation",
    description:
      "An AI development agent focused on automated code generation and task completion.",
    configPath: "AGENTS.md",
    website: "https://droid.dev",
    category: "cloud",
    features: [
      "Task automation",
      "Code generation",
      "Cloud execution",
      "CI/CD integration",
    ],
    config: {
      appendMode: true,
    },
    logo: droidLogo,
  },
  {
    id: "antigravity",
    name: "Antigravity",
    subtitle: "Rapid AI development",
    description:
      "An AI-powered development platform for building and deploying applications faster.",
    configPath: ".agent/rules/ultracite.md",
    website: "https://antigravity.dev",
    category: "cloud",
    features: [
      "Rapid development",
      "Cloud deployment",
      "AI assistance",
      "Full-stack support",
    ],
    config: {},
    logo: antigravityLogo,
  },
  {
    id: "opencode",
    name: "OpenCode",
    subtitle: "Open-source coding agent",
    description:
      "An open-source AI coding agent that runs in your terminal, desktop, or IDE with support for 75+ LLM providers.",
    configPath: "AGENTS.md",
    website: "https://opencode.ai",
    category: "cli",
    features: [
      "Open source",
      "Multi-provider support",
      "Terminal and desktop",
      "Privacy focused",
    ],
    config: {
      appendMode: true,
    },
    logo: opencodeLogo,
  },
  {
    id: "crush",
    name: "Crush",
    subtitle: "Glamorous terminal agent",
    description:
      "Charmbracelet's glamorous AI coding agent for your terminal with multi-model support.",
    configPath: "CRUSH.md",
    website: "https://github.com/charmbracelet/crush",
    category: "cli",
    features: [
      "Terminal TUI",
      "Multi-model support",
      "Cross-platform",
      "Open source",
    ],
    config: {
      appendMode: true,
    },
    logo: crushLogo,
  },
  {
    id: "qwen",
    name: "Qwen Code",
    subtitle: "Alibaba's coding CLI",
    description:
      "Alibaba's command-line interface for Qwen3-Coder, enabling agentic coding with natural language.",
    configPath: "AGENTS.md",
    website: "https://github.com/QwenLM/Qwen3-Coder",
    category: "cli",
    features: [
      "Agentic coding",
      "256K context window",
      "Multi-language support",
      "Open source model",
    ],
    config: {
      appendMode: true,
    },
    logo: qwenLogo,
  },
  {
    id: "trae",
    name: "Trae AI",
    subtitle: "ByteDance's AI IDE",
    description:
      "ByteDance's AI-powered IDE built on VS Code with free access to GPT-4o and Claude 3.5 Sonnet.",
    configPath: ".trae/rules/project_rules.md",
    website: "https://www.trae.ai",
    category: "ide",
    features: [
      "Free AI models",
      "VS Code based",
      "Bilingual support",
      "Project-level code generation",
    ],
    config: {},
    logo: traeLogo,
  },
  {
    id: "amazon-q-cli",
    name: "Amazon Q CLI",
    subtitle: "AWS's terminal AI",
    description:
      "Amazon's AI-powered CLI with command autocompletion, natural language chat, and AWS integration.",
    configPath: ".amazonq/rules/ultracite.md",
    website: "https://aws.amazon.com/q/developer",
    category: "cli",
    features: [
      "AWS integration",
      "Command autocompletion",
      "Multi-language support",
      "Agentic workflows",
    ],
    config: {
      appendMode: true,
    },
    logo: amazonQLogo,
  },
  {
    id: "firebender",
    name: "Firebender",
    subtitle: "Android Studio AI",
    description:
      "The most powerful AI coding assistant for Android Studio with codebase context and up-to-date Android knowledge.",
    configPath: "firebender.json",
    website: "https://firebender.com",
    category: "extension",
    features: [
      "Android Studio plugin",
      "Codebase context",
      "Latest Android docs",
      "Privacy focused",
    ],
    config: {},
    logo: firebenderLogo,
  },
];

/** Get all agent IDs */
export const agentIds = agents.map((agent) => agent.id) as [
  string,
  ...string[],
];

/** Get an agent by ID */
export const getAgentById = (id: string): Agent | undefined =>
  agents.find((agent) => agent.id === id);

/** Get agents by category */
export const getAgentsByCategory = (category: AgentCategory): Agent[] =>
  agents.filter((agent) => agent.category === category);

/** Category display labels */
export const categoryLabels: Record<AgentCategory, string> = {
  ide: "IDE / Editor",
  cli: "Command Line",
  cloud: "Cloud Platform",
  extension: "VS Code Extension",
};
