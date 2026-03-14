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
  appendMode?: boolean;
  header?: string;
  path: string;
}

export interface Agent {
  config: AgentConfig;
  description: string;
  hooks?: HooksConfig;
  id: string;
  logo: StaticImageData;
  name: string;
  subtitle: string;
}

export const agents: Agent[] = [
  {
    config: {
      path: ".claude/CLAUDE.md",
      appendMode: true,
    },
    description:
      "Anthropic's official CLI for Claude, an agentic coding tool that lives in your terminal.",
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
    id: "claude",
    logo: claudeLogo,
    name: "Claude Code",
    subtitle: "Anthropic's agentic CLI",
  },
  {
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    description:
      "OpenAI's cloud-based coding agent for autonomous software development tasks.",
    id: "codex",
    logo: codexLogo,
    name: "Codex",
    subtitle: "OpenAI's coding agent",
  },
  {
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    description:
      "Google's asynchronous AI coding agent that works in the background to complete development tasks.",
    id: "jules",
    logo: julesLogo,
    name: "Jules",
    subtitle: "Google's async agent",
  },
  {
    config: {
      path: ".github/copilot-instructions.md",
      appendMode: true,
      header: `---
applyTo: "**/*.{ts,tsx,js,jsx}"
---`,
    },
    description:
      "GitHub's AI pair programmer that suggests code completions and helps write code faster.",
    hooks: {
      path: ".github/hooks/ultracite.json",
      getContent: (command) => ({
        hooks: {
          PostToolUse: [
            {
              type: "command",
              command,
            },
          ],
        },
      }),
    },
    id: "copilot",
    logo: copilotLogo,
    name: "GitHub Copilot",
    subtitle: "GitHub's AI pair programmer",
  },
  {
    config: {
      path: ".clinerules",
      appendMode: true,
    },
    description:
      "An autonomous coding agent for VS Code that can create and edit files, run commands, and more.",
    id: "cline",
    logo: clineLogo,
    name: "Cline",
    subtitle: "Autonomous VS Code agent",
  },
  {
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    description:
      "Sourcegraph's AI coding agent that understands your entire codebase for intelligent assistance.",
    id: "amp",
    logo: ampLogo,
    name: "AMP",
    subtitle: "Sourcegraph's coding agent",
  },
  {
    config: {
      path: "ultracite.md",
    },
    description:
      "AI pair programming in your terminal with support for multiple LLM providers.",
    id: "aider",
    logo: aiderLogo,
    name: "Aider",
    subtitle: "Terminal pair programming",
  },
  {
    config: {
      path: ".idx/airules.md",
      appendMode: true,
    },
    description:
      "Google's AI-powered development environment integrated with Firebase services.",
    id: "firebase-studio",
    logo: firebaseStudioLogo,
    name: "Firebase Studio",
    subtitle: "Google's cloud IDE",
  },
  {
    config: {
      path: ".openhands/microagents/repo.md",
      appendMode: true,
    },
    description:
      "An open-source platform for AI software development agents with autonomous capabilities.",
    id: "open-hands",
    logo: openHandsLogo,
    name: "OpenHands",
    subtitle: "Open-source AI agents",
  },
  {
    config: {
      path: "GEMINI.md",
      appendMode: true,
    },
    description:
      "Google's command-line interface for Gemini, bringing AI assistance to your terminal.",
    id: "gemini",
    logo: geminiLogo,
    name: "Gemini",
    subtitle: "Google's terminal AI",
  },
  {
    config: {
      path: ".junie/guidelines.md",
      appendMode: true,
    },
    description:
      "JetBrains' AI coding agent integrated into their IDE ecosystem.",
    id: "junie",
    logo: junieLogo,
    name: "Junie",
    subtitle: "JetBrains' AI agent",
  },
  {
    config: {
      path: ".augment/rules/ultracite.md",
    },
    description:
      "An AI coding assistant focused on enterprise development workflows and team collaboration.",
    id: "augmentcode",
    logo: augmentcodeLogo,
    name: "Augment Code",
    subtitle: "Enterprise AI assistant",
  },
  {
    config: {
      path: ".kilocode/rules/ultracite.md",
    },
    description:
      "A VS Code extension providing AI-powered coding assistance with customizable rules.",
    id: "kilo-code",
    logo: kiloCodeLogo,
    name: "Kilo Code",
    subtitle: "Customizable VS Code AI",
  },
  {
    config: {
      path: ".goosehints",
      appendMode: true,
    },
    description:
      "Block's open-source AI developer agent for autonomous software development.",
    id: "goose",
    logo: gooseLogo,
    name: "Goose",
    subtitle: "Block's open-source agent",
  },
  {
    config: {
      path: ".roo/rules/ultracite.md",
      appendMode: true,
    },
    description:
      "An AI coding assistant focused on understanding and navigating complex codebases.",
    id: "roo-code",
    logo: rooCodeLogo,
    name: "Roo Code",
    subtitle: "Codebase navigation AI",
  },
  {
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    description:
      "A modern terminal with AI-powered command suggestions and workflow automation.",
    id: "warp",
    logo: warpLogo,
    name: "Warp",
    subtitle: "Modern AI terminal",
  },
  {
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    description:
      "An AI development agent focused on automated code generation and task completion.",
    id: "droid",
    logo: droidLogo,
    name: "Droid",
    subtitle: "Automated code generation",
  },
  {
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    description:
      "An open-source AI coding agent that runs in your terminal, desktop, or IDE with support for 75+ LLM providers.",
    id: "opencode",
    logo: opencodeLogo,
    name: "OpenCode",
    subtitle: "Open-source coding agent",
  },
  {
    config: {
      path: "CRUSH.md",
      appendMode: true,
    },
    description:
      "Charmbracelet's glamorous AI coding agent for your terminal with multi-model support.",
    id: "crush",
    logo: crushLogo,
    name: "Crush",
    subtitle: "Glamorous terminal agent",
  },
  {
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    description:
      "Alibaba's command-line interface for Qwen3-Coder, enabling agentic coding with natural language.",
    id: "qwen",
    logo: qwenLogo,
    name: "Qwen Code",
    subtitle: "Alibaba's coding CLI",
  },
  {
    config: {
      path: ".amazonq/rules/ultracite.md",
      appendMode: true,
    },
    description:
      "Amazon's AI-powered CLI with command autocompletion, natural language chat, and AWS integration.",
    id: "amazon-q-cli",
    logo: amazonQLogo,
    name: "Amazon Q CLI",
    subtitle: "AWS's terminal AI",
  },
  {
    config: {
      path: "firebender.json",
    },
    description:
      "The most powerful AI coding assistant for Android Studio with codebase context and up-to-date Android knowledge.",
    id: "firebender",
    logo: firebenderLogo,
    name: "Firebender",
    subtitle: "Android Studio AI",
  },
  {
    config: {
      path: ".cursor/rules/ultracite.mdc",
      appendMode: true,
    },
    description:
      "Cursor's CLI, built to help you ship right from your terminal.",
    id: "cursor-cli",
    logo: cursorCliLogo,
    name: "Cursor CLI",
    subtitle: "Cursor's terminal agent",
  },
  {
    config: {
      path: "VIBE.md",
    },
    description:
      "Mistral's minimal CLI coding agent for streamlined development tasks.",
    id: "mistral-vibe",
    logo: mistralLogo,
    name: "Mistral Vibe",
    subtitle: "Minimal CLI coding agent",
  },
  {
    config: {
      path: "AGENTS.md",
      appendMode: true,
    },
    description: "Vercel's agent, powered by their AI Cloud.",
    id: "vercel",
    logo: vercelLogo,
    name: "Vercel Agent",
    subtitle: "Vercel's AI Cloud agent",
  },
];
