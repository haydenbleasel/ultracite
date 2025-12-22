import type { StaticImageData } from "next/image";
import aiderLogo from "../components/agents/logos/aider.svg";
import ampLogo from "../components/agents/logos/amp.svg";
import antigravityLogo from "../components/agents/logos/antigravity.svg";
import augmentcodeLogo from "../components/agents/logos/augmentcode.svg";
import claudeLogo from "../components/agents/logos/claude.svg";
import clineLogo from "../components/agents/logos/cline.svg";
import codexLogo from "../components/agents/logos/codex.svg";
import cursorLogo from "../components/agents/logos/cursor.svg";
import droidLogo from "../components/agents/logos/droid.svg";
import firebaseStudioLogo from "../components/agents/logos/firebase-studio.svg";
import geminiLogo from "../components/agents/logos/gemini.svg";
import gooseLogo from "../components/agents/logos/goose.svg";
import junieLogo from "../components/agents/logos/junie.svg";
import kiloCodeLogo from "../components/agents/logos/kilo-code.svg";
import kiroLogo from "../components/agents/logos/kiro.svg";
import openHandsLogo from "../components/agents/logos/open-hands.svg";
import rooCodeLogo from "../components/agents/logos/roo-code.svg";
import vscodeCopilotLogo from "../components/agents/logos/vscode-copilot.svg";
import warpLogo from "../components/agents/logos/warp.svg";
import windsurfLogo from "../components/agents/logos/windsurf.svg";
import zedLogo from "../components/agents/logos/zed.svg";

export interface Agent {
  id: string;
  name: string;
  description: string;
  configPath: string;
  website: string;
  category: "ide" | "cli" | "cloud" | "extension";
  features: string[];
  appendMode?: boolean;
  logo: StaticImageData;
}

export const agents: Agent[] = [
  {
    id: "claude",
    name: "Claude Code",
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
    appendMode: true,
    logo: claudeLogo,
  },
  {
    id: "codex",
    name: "OpenAI Codex / Jules",
    description:
      "OpenAI's cloud-based coding agents including Codex CLI and Jules for autonomous development.",
    configPath: "AGENTS.md",
    website: "https://openai.com",
    category: "cloud",
    features: [
      "Cloud-based execution",
      "Autonomous coding",
      "GitHub integration",
      "Async task handling",
    ],
    appendMode: true,
    logo: codexLogo,
  },
  {
    id: "cursor",
    name: "Cursor",
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
    logo: cursorLogo,
  },
  {
    id: "windsurf",
    name: "Windsurf",
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
    logo: windsurfLogo,
  },
  {
    id: "vscode-copilot",
    name: "GitHub Copilot",
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
    appendMode: true,
    logo: vscodeCopilotLogo,
  },
  {
    id: "zed",
    name: "Zed",
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
    appendMode: true,
    logo: zedLogo,
  },
  {
    id: "kiro",
    name: "Kiro",
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
    logo: kiroLogo,
  },
  {
    id: "cline",
    name: "Cline",
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
    appendMode: true,
    logo: clineLogo,
  },
  {
    id: "amp",
    name: "AMP",
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
    appendMode: true,
    logo: ampLogo,
  },
  {
    id: "aider",
    name: "Aider",
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
    logo: aiderLogo,
  },
  {
    id: "firebase-studio",
    name: "Firebase Studio",
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
    appendMode: true,
    logo: firebaseStudioLogo,
  },
  {
    id: "open-hands",
    name: "OpenHands",
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
    appendMode: true,
    logo: openHandsLogo,
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
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
    appendMode: true,
    logo: geminiLogo,
  },
  {
    id: "junie",
    name: "Junie",
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
    appendMode: true,
    logo: junieLogo,
  },
  {
    id: "augmentcode",
    name: "Augment Code",
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
    logo: augmentcodeLogo,
  },
  {
    id: "kilo-code",
    name: "Kilo Code",
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
    logo: kiloCodeLogo,
  },
  {
    id: "goose",
    name: "Codename Goose",
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
    appendMode: true,
    logo: gooseLogo,
  },
  {
    id: "roo-code",
    name: "Roo Code",
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
    appendMode: true,
    logo: rooCodeLogo,
  },
  {
    id: "warp",
    name: "Warp",
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
    appendMode: true,
    logo: warpLogo,
  },
  {
    id: "droid",
    name: "Droid",
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
    appendMode: true,
    logo: droidLogo,
  },
  {
    id: "antigravity",
    name: "Antigravity",
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
    logo: antigravityLogo,
  },
];

export const getAgentById = (id: string): Agent | undefined =>
  agents.find((agent) => agent.id === id);

export const getAgentsByCategory = (
  category: Agent["category"]
): Agent[] => agents.filter((agent) => agent.category === category);

export const categoryLabels: Record<Agent["category"], string> = {
  ide: "IDE / Editor",
  cli: "Command Line",
  cloud: "Cloud Platform",
  extension: "VS Code Extension",
};
