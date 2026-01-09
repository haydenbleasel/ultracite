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
    config: {
      appendMode: true,
      path: ".claude/CLAUDE.md",
    },
    description:
      "Anthropic's official CLI for Claude, an agentic coding tool that lives in your terminal.",
    hooks: {
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
      path: ".claude/settings.json",
    },
    id: "claude",
    logo: claudeLogo,
    name: "Claude Code",
    subtitle: "Anthropic's agentic CLI",
  },
  {
    config: {
      appendMode: true,
      path: "AGENTS.md",
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
      appendMode: true,
      path: "AGENTS.md",
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
      appendMode: true,
      header: `---
applyTo: "**/*.{ts,tsx,js,jsx}"
---`,
      path: ".github/copilot-instructions.md",
    },
    description:
      "GitHub's AI pair programmer that suggests code completions and helps write code faster.",
    id: "copilot",
    logo: copilotLogo,
    name: "GitHub Copilot",
    subtitle: "GitHub's AI pair programmer",
  },
  {
    config: {
      appendMode: true,
      path: ".clinerules",
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
      appendMode: true,
      path: "AGENT.md",
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
      appendMode: true,
      path: ".idx/airules.md",
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
      appendMode: true,
      path: ".openhands/microagents/repo.md",
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
      appendMode: true,
      path: "GEMINI.md",
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
      appendMode: true,
      path: ".junie/guidelines.md",
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
      appendMode: true,
      path: ".goosehints",
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
      appendMode: true,
      path: ".roo/rules/ultracite.md",
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
      appendMode: true,
      path: "WARP.md",
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
      appendMode: true,
      path: "AGENTS.md",
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
      appendMode: true,
      path: "AGENTS.md",
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
      appendMode: true,
      path: "CRUSH.md",
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
      appendMode: true,
      path: "AGENTS.md",
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
      appendMode: true,
      path: ".amazonq/rules/ultracite.md",
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
      appendMode: true,
      path: ".cursor/rules/ultracite.mdc",
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
      appendMode: true,
      path: "AGENTS.md",
    },
    description: "Vercel's agent, powered by their AI Cloud.",
    id: "vercel",
    logo: vercelLogo,
    name: "Vercel Agent",
    subtitle: "Vercel's AI Cloud agent",
  },
];
