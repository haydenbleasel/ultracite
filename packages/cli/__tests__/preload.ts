import { mock } from "bun:test";

// Mock glob module before any imports that use it
// This is needed for tsconfig.test.ts and other tests that use glob
mock.module("glob", () => ({
  glob: mock(() => Promise.resolve([])),
}));

// Mock SVG for StaticImageData type
const mockSvg = { src: "/mock.svg", height: 24, width: 24, blurDataURL: "" };

// VS Code base configuration (matches the real implementation)
const vscodeBaseConfig = {
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "emmet.showExpandedAbbreviation": "never",
};

const vscodeBiomeConfig = {
  "[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[javascriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[json]": { "editor.defaultFormatter": "biomejs.biome" },
  "[jsonc]": { "editor.defaultFormatter": "biomejs.biome" },
  "editor.codeActionsOnSave": {
    "source.action.noDuplicateClasses.biome": "explicit",
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit",
  },
};

// Mock the data package modules that contain SVG imports requiring react
// These mocks must be set up before any imports that use these modules
mock.module("@repo/data/providers", () => ({
  providers: [
    {
      id: "biome",
      name: "Biome",
      subtitle: "The modern all-in-one toolchain",
      description: "Fast formatter and linter written in Rust",
      configFiles: [{ name: "biome.jsonc", lang: "json", code: () => "{}" }],
      vscodeExtensionId: "biomejs.biome",
      logo: mockSvg,
    },
    {
      id: "eslint",
      name: "ESLint + Prettier + Stylelint",
      subtitle: "The most mature linting ecosystem",
      description: "Battle-tested linting solution",
      configFiles: [
        { name: "eslint.config.mjs", lang: "javascript", code: () => "" },
        { name: "prettier.config.mjs", lang: "javascript", code: () => "" },
        { name: "stylelint.config.mjs", lang: "javascript", code: () => "" },
      ],
      vscodeExtensionId: "dbaeumer.vscode-eslint",
      logo: mockSvg,
    },
    {
      id: "oxlint",
      name: "Oxlint + Oxfmt",
      subtitle: "The fastest linter available",
      description: "50-100x faster than ESLint",
      configFiles: [
        { name: ".oxlintrc.json", lang: "json", code: () => "{}" },
        { name: ".oxfmtrc.jsonc", lang: "json", code: () => "{}" },
      ],
      vscodeExtensionId: "oxc.oxc-vscode",
      logo: mockSvg,
    },
  ],
}));

mock.module("@repo/data/agents", () => ({
  agents: [
    {
      id: "claude",
      name: "Claude Code",
      subtitle: "Anthropic's agentic CLI",
      description: "Anthropic's official CLI for Claude",
      config: { path: ".claude/CLAUDE.md", appendMode: true },
      logo: mockSvg,
      hooks: {
        path: ".claude/settings.json",
        getContent: (command: string) => ({
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
      description: "OpenAI's cloud-based coding agent",
      config: { path: "AGENTS.md", appendMode: true },
      logo: mockSvg,
    },
    {
      id: "jules",
      name: "Jules",
      subtitle: "Google's async agent",
      description: "Google's asynchronous AI coding agent",
      config: { path: "AGENTS.md", appendMode: true },
      logo: mockSvg,
    },
    {
      id: "copilot",
      name: "GitHub Copilot",
      subtitle: "GitHub's AI pair programmer",
      description: "GitHub's AI pair programmer",
      config: {
        path: ".github/copilot-instructions.md",
        appendMode: true,
        header: `---
applyTo: "**/*.{ts,tsx,js,jsx}"
---`,
      },
      logo: mockSvg,
      hooks: {
        path: ".github/hooks/ultracite.json",
        getContent: (command: string) => ({
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
    },
    {
      id: "cline",
      name: "Cline",
      subtitle: "Autonomous VS Code agent",
      description: "An autonomous coding agent for VS Code",
      config: { path: ".clinerules", appendMode: true },
      logo: mockSvg,
    },
    {
      id: "roo-code",
      name: "Roo Code",
      subtitle: "AI-powered code assistant",
      description: "AI code assistant",
      config: { path: ".roo/rules.md", appendMode: true },
      logo: mockSvg,
    },
    {
      id: "aider",
      name: "Aider",
      subtitle: "AI pair programming in terminal",
      description: "AI pair programming tool",
      config: { path: ".aider/conventions.md", appendMode: true },
      logo: mockSvg,
    },
    {
      id: "gemini",
      name: "Gemini Code Assist",
      subtitle: "Google's AI assistant",
      description: "Google's AI coding assistant",
      config: { path: ".gemini/style-guide.md", appendMode: true },
      logo: mockSvg,
    },
    {
      id: "junie",
      name: "Junie",
      subtitle: "JetBrains AI assistant",
      description: "JetBrains AI coding assistant",
      config: { path: ".junie/guidelines.md", appendMode: true },
      logo: mockSvg,
    },
  ],
}));

mock.module("@repo/data/editors", () => ({
  editors: [
    {
      id: "vscode",
      name: "VS Code",
      subtitle: "Microsoft's code editor",
      description: "Popular code editor",
      config: {
        path: ".vscode/settings.json",
        getContent: () => ({ ...vscodeBaseConfig, ...vscodeBiomeConfig }),
        extensionCommand: "code --install-extension",
      },
      logo: mockSvg,
    },
    {
      id: "zed",
      name: "Zed",
      subtitle: "High-performance code editor",
      description: "Fast code editor",
      config: {
        path: ".zed/settings.json",
        getContent: () => ({
          formatter: "language_server",
          format_on_save: "on",
          languages: {
            JavaScript: {
              formatter: { language_server: { name: "biome" } },
            },
          },
        }),
      },
      logo: mockSvg,
    },
    {
      id: "cursor",
      name: "Cursor",
      subtitle: "AI-first code editor",
      description: "AI-powered code editor",
      hooks: {
        path: ".cursor/hooks.json",
        getContent: (command: string) => ({
          version: 1,
          hooks: {
            afterFileEdit: [
              {
                event: "afterFileEdit",
                command,
                pattern: "**/*.{js,jsx,ts,tsx,json,css,md,mdx,html}",
              },
            ],
          },
        }),
      },
      config: {
        path: ".vscode/settings.json",
        getContent: () => ({ ...vscodeBaseConfig, ...vscodeBiomeConfig }),
      },
      logo: mockSvg,
    },
    {
      id: "windsurf",
      name: "Windsurf",
      subtitle: "Codeium's AI editor",
      description: "AI-powered editor by Codeium",
      hooks: {
        path: ".windsurf/hooks.json",
        getContent: (command: string) => ({
          version: 1,
          hooks: {
            afterFileEdit: [
              {
                event: "afterFileEdit",
                command,
                pattern: "**/*.{js,jsx,ts,tsx,json,css,md,mdx,html}",
              },
            ],
          },
        }),
      },
      config: {
        path: ".vscode/settings.json",
        getContent: () => ({ ...vscodeBaseConfig, ...vscodeBiomeConfig }),
      },
      logo: mockSvg,
    },
  ],
}));
