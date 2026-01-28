import type { StaticImageData } from "next/image";
import aiderLogo from "../logos/aider.svg";
import amazonQLogo from "../logos/amazon-q.svg";
import ampLogo from "../logos/amp.svg";
import augmentcodeLogo from "../logos/augmentcode.svg";
import claudeLogo from "../logos/claude.svg";
import clineLogo from "../logos/cline.svg";
import codexLogo from "../logos/codex.svg";
import copilotLogo from "../logos/copilot.svg";
import crushLogo from "../logos/crush.svg";
import cursorCliLogo from "../logos/cursor.svg";
import droidLogo from "../logos/droid.svg";
import firebaseStudioLogo from "../logos/firebase-studio.svg";
import firebenderLogo from "../logos/firebender.svg";
import geminiLogo from "../logos/gemini.svg";
import gooseLogo from "../logos/goose.svg";
import julesLogo from "../logos/jules.svg";
import junieLogo from "../logos/junie.svg";
import kiloCodeLogo from "../logos/kilo-code.svg";
import mistralLogo from "../logos/mistral.svg";
import openHandsLogo from "../logos/open-hands.svg";
import opencodeLogo from "../logos/opencode.svg";
import qwenLogo from "../logos/qwen.svg";
import rooCodeLogo from "../logos/roo-code.svg";
import vercelLogo from "../logos/vercel.svg";
import warpLogo from "../logos/warp.svg";
import type { HooksConfig } from "./types";

export interface AgentConfig {
  path: string;
  appendMode?: boolean;
  header?: string;
}

export interface Agent {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  config: AgentConfig;
  logo: StaticImageData;
  hooks?: HooksConfig;
}

export const agents: Agent[] = [
  {
    id: "claude",
    name: "Claude Code",
    subtitle: "Anthropic's agentic CLI",
    description:
      "Anthropic's official CLI for Claude, an agentic coding tool that lives in your terminal.",
    config: {
      path: ".claude/CLAUDE.md",
      appendMode: true,
    },
    logo: claudeLogo,
    hooks: {
      path: ".claude/settings.json",
      getContent: (command) => ({
        hooks: {
          PostToolUse: [
            {
              matcher: "Write|Edit",
              hooks: [
                {
                  type: "command",
                  command,
                },
              ],
            },
          ],
        },
      }),
    },
  },
  {
    id: "codex",
    name: "Codex",
    subtitle: "OpenAI's coding agent",
    description:
      "OpenAI's cloud-based coding agent for autonomous software development tasks.",
    config: {
      path: "AGENTS.md",
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
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    logo: julesLogo,
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    subtitle: "GitHub's AI pair programmer",
    description:
      "GitHub's AI pair programmer that suggests code completions and helps write code faster.",
    config: {
      path: ".github/copilot-instructions.md",
      appendMode: true,
      header: `---
applyTo: "**/*.{ts,tsx,js,jsx}"
---`,
    },
    logo: copilotLogo,
  },
  {
    id: "cline",
    name: "Cline",
    subtitle: "Autonomous VS Code agent",
    description:
      "An autonomous coding agent for VS Code that can create and edit files, run commands, and more.",
    config: {
      path: ".clinerules",
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
    config: {
      path: "AGENT.md",
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
    config: {
      path: "ultracite.md",
    },
    logo: aiderLogo,
  },
  {
    id: "firebase-studio",
    name: "Firebase Studio",
    subtitle: "Google's cloud IDE",
    description:
      "Google's AI-powered development environment integrated with Firebase services.",
    config: {
      path: ".idx/airules.md",
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
    config: {
      path: ".openhands/microagents/repo.md",
      appendMode: true,
    },
    logo: openHandsLogo,
  },
  {
    id: "gemini",
    name: "Gemini",
    subtitle: "Google's terminal AI",
    description:
      "Google's command-line interface for Gemini, bringing AI assistance to your terminal.",
    config: {
      path: "GEMINI.md",
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
    config: {
      path: ".junie/guidelines.md",
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
    config: {
      path: ".augment/rules/ultracite.md",
    },
    logo: augmentcodeLogo,
  },
  {
    id: "kilo-code",
    name: "Kilo Code",
    subtitle: "Customizable VS Code AI",
    description:
      "A VS Code extension providing AI-powered coding assistance with customizable rules.",
    config: {
      path: ".kilocode/rules/ultracite.md",
    },
    logo: kiloCodeLogo,
  },
  {
    id: "goose",
    name: "Goose",
    subtitle: "Block's open-source agent",
    description:
      "Block's open-source AI developer agent for autonomous software development.",
    config: {
      path: ".goosehints",
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
    config: {
      path: ".roo/rules/ultracite.md",
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
    config: {
      path: "AGENTS.md",
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
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    logo: droidLogo,
  },
  {
    id: "opencode",
    name: "OpenCode",
    subtitle: "Open-source coding agent",
    description:
      "An open-source AI coding agent that runs in your terminal, desktop, or IDE with support for 75+ LLM providers.",
    config: {
      path: "AGENTS.md",
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
    config: {
      path: "CRUSH.md",
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
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    logo: qwenLogo,
  },
  {
    id: "amazon-q-cli",
    name: "Amazon Q CLI",
    subtitle: "AWS's terminal AI",
    description:
      "Amazon's AI-powered CLI with command autocompletion, natural language chat, and AWS integration.",
    config: {
      path: ".amazonq/rules/ultracite.md",
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
    config: {
      path: "firebender.json",
    },
    logo: firebenderLogo,
  },
  {
    id: "cursor-cli",
    name: "Cursor CLI",
    subtitle: "Cursor's terminal agent",
    description:
      "Cursor's CLI, built to help you ship right from your terminal.",
    config: {
      path: ".cursor/rules/ultracite.mdc",
      appendMode: true,
    },
    logo: cursorCliLogo,
  },
  {
    id: "mistral-vibe",
    name: "Mistral Vibe",
    subtitle: "Minimal CLI coding agent",
    description:
      "Mistral's minimal CLI coding agent for streamlined development tasks.",
    config: {
      path: "VIBE.md",
    },
    logo: mistralLogo,
  },
  {
    id: "vercel",
    name: "Vercel Agent",
    subtitle: "Vercel's AI Cloud agent",
    description: "Vercel's agent, powered by their AI Cloud.",
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    logo: vercelLogo,
  },
];
