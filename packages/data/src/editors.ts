import type { StaticImageData } from "next/image";
import antigravityLogo from "../logos/antigravity.svg";
import cursorLogo from "../logos/cursor.svg";
import kiroLogo from "../logos/kiro.svg";
import traeLogo from "../logos/trae.svg";
import voidLogo from "../logos/void.svg";
import vscodeLogo from "../logos/vscode.svg";
import windsurfLogo from "../logos/windsurf.svg";
import zedLogo from "../logos/zed.svg";

export type EditorCliValue = "vscode" | "zed";

export interface EditorRulesConfig {
  /** Path to the rules file */
  path: string;
  /** Header content to prepend to the rules file (e.g., frontmatter) */
  header?: string;
  /** Whether to append to existing file instead of replacing */
  appendMode?: boolean;
}

export interface Editor {
  /** Unique identifier for the editor */
  id: string;
  /** Display name */
  name: string;
  /** Short tagline for navbar */
  subtitle: string;
  /** Full description */
  description: string;
  /** Path to the settings config file */
  configPath: string;
  /** Editor's website URL */
  website: string;
  /** CLI value for --editors flag */
  cliValue: EditorCliValue;
  /** Key features of the editor */
  features: string[];
  /** Logo for UI display */
  logo: StaticImageData;
  /** Rules file configuration (for AI agent rules) */
  rules?: EditorRulesConfig;
}

export const editors: Editor[] = [
  {
    id: "vscode",
    name: "Visual Studio Code",
    subtitle: "The most popular code editor",
    description:
      "Microsoft's popular code editor with extensive extension support and built-in Git integration.",
    configPath: ".vscode/settings.json",
    website: "https://code.visualstudio.com",
    cliValue: "vscode",
    features: [
      "Extension marketplace",
      "Integrated terminal",
      "Git integration",
      "IntelliSense",
    ],
    logo: vscodeLogo,
  },
  {
    id: "cursor",
    name: "Cursor",
    subtitle: "The AI-first code editor",
    description:
      "The AI-first code editor built on VS Code with deep AI integration for coding assistance.",
    configPath: ".vscode/settings.json",
    website: "https://cursor.com",
    cliValue: "vscode",
    features: [
      "AI-native editor",
      "Inline completions",
      "Chat interface",
      "Codebase understanding",
    ],
    logo: cursorLogo,
    rules: {
      path: ".cursor/rules/ultracite.mdc",
      header: `---
description: Ultracite Rules - AI-Ready Formatter and Linter
globs: "**/*.{ts,tsx,js,jsx,json,jsonc,html,vue,svelte,astro,css,yaml,yml,graphql,gql,md,mdx,grit}"
alwaysApply: false
---`,
    },
  },
  {
    id: "windsurf",
    name: "Windsurf",
    subtitle: "The agentic IDE by Codeium",
    description:
      "Codeium's agentic IDE that combines AI assistance with a powerful VS Code-based development environment.",
    configPath: ".vscode/settings.json",
    website: "https://codeium.com/windsurf",
    cliValue: "vscode",
    features: [
      "Agentic workflows",
      "Cascade AI system",
      "VS Code compatibility",
      "Multi-file editing",
    ],
    logo: windsurfLogo,
    rules: {
      path: ".windsurf/rules/ultracite.md",
    },
  },
  {
    id: "antigravity",
    name: "Antigravity",
    subtitle: "Google's next-generation IDE",
    description:
      "An AI-powered development platform built on VS Code for building and deploying applications faster.",
    configPath: ".vscode/settings.json",
    website: "https://antigravity.dev",
    cliValue: "vscode",
    features: [
      "Rapid development",
      "Cloud deployment",
      "AI assistance",
      "Full-stack support",
    ],
    logo: antigravityLogo,
  },
  {
    id: "kiro",
    name: "Kiro",
    subtitle: "AWS's spec-driven IDE",
    description:
      "AWS's spec-driven AI development environment for building production-ready applications.",
    configPath: ".vscode/settings.json",
    website: "https://kiro.dev",
    cliValue: "vscode",
    features: [
      "Spec-driven development",
      "AWS integration",
      "Automated testing",
      "Production-ready output",
    ],
    logo: kiroLogo,
    rules: {
      path: ".kiro/steering/ultracite.md",
    },
  },
  {
    id: "trae",
    name: "Trae AI",
    subtitle: "ByteDance's AI IDE",
    description:
      "ByteDance's AI-powered IDE built on VS Code with free access to GPT-4o and Claude 3.5 Sonnet.",
    configPath: ".vscode/settings.json",
    website: "https://www.trae.ai",
    cliValue: "vscode",
    features: [
      "Free AI models",
      "VS Code based",
      "Bilingual support",
      "Project-level code generation",
    ],
    logo: traeLogo,
    rules: {
      path: ".trae/rules/project_rules.md",
    },
  },
  {
    id: "void",
    name: "Void",
    subtitle: "Open-source AI editor",
    description:
      "An open-source AI code editor built on VS Code with a focus on privacy and extensibility.",
    configPath: ".vscode/settings.json",
    website: "https://voideditor.com",
    cliValue: "vscode",
    features: [
      "Open source",
      "AI-native editor",
      "VS Code compatible",
      "Privacy focused",
    ],
    logo: voidLogo,
  },
  {
    id: "zed",
    name: "Zed",
    subtitle: "The high-performance editor",
    description:
      "A high-performance, multiplayer code editor built in Rust with built-in AI assistance.",
    configPath: ".zed/settings.json",
    website: "https://zed.dev",
    cliValue: "zed",
    features: [
      "Lightning fast",
      "Collaborative editing",
      "Built-in AI assistant",
      "GPU-accelerated",
    ],
    logo: zedLogo,
    rules: {
      path: ".rules",
      appendMode: true,
    },
  },
];

/** Get all editor IDs */
export const editorIds = editors.map((editor) => editor.id) as [
  string,
  ...string[],
];

/** Get all unique CLI values */
export const editorCliValues: EditorCliValue[] = ["vscode", "zed"];

/** Get an editor by ID */
export const getEditorById = (id: string): Editor | undefined =>
  editors.find((editor) => editor.id === id);

/** Get editors by CLI value */
export const getEditorsByCliValue = (cliValue: EditorCliValue): Editor[] =>
  editors.filter((editor) => editor.cliValue === cliValue);
