import { mock } from "bun:test";

// Mock glob module before any imports that use it
// This is needed for tsconfig.test.ts and other tests that use glob
mock.module("glob", () => ({
  glob: mock(() => Promise.resolve([])),
}));

// Mock SVG for StaticImageData type
const mockSvg = { blurDataURL: "", height: 24, src: "/mock.svg", width: 24 };

// VS Code base configuration (matches the real implementation)
const vscodeBaseConfig = {
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnPaste": true,
  "editor.formatOnSave": true,
  "emmet.showExpandedAbbreviation": "never",
  "typescript.tsdk": "node_modules/typescript/lib",
};

const vscodeBiomeConfig = {
  "[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[javascriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[json]": { "editor.defaultFormatter": "biomejs.biome" },
  "[jsonc]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
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
      configFiles: [{ name: "biome.jsonc", lang: "json", code: () => "{}" }],
      description: "Fast formatter and linter written in Rust",
      id: "biome",
      logo: mockSvg,
      name: "Biome",
      subtitle: "The modern all-in-one toolchain",
      vscodeExtensionId: "biomejs.biome",
    },
    {
      configFiles: [
        { name: "eslint.config.mjs", lang: "javascript", code: () => "" },
        { name: "prettier.config.mjs", lang: "javascript", code: () => "" },
        { name: "stylelint.config.mjs", lang: "javascript", code: () => "" },
      ],
      description: "Battle-tested linting solution",
      id: "eslint",
      logo: mockSvg,
      name: "ESLint + Prettier + Stylelint",
      subtitle: "The most mature linting ecosystem",
      vscodeExtensionId: "dbaeumer.vscode-eslint",
    },
    {
      configFiles: [
        { name: ".oxlintrc.json", lang: "json", code: () => "{}" },
        { name: ".oxfmtrc.jsonc", lang: "json", code: () => "{}" },
      ],
      description: "50-100x faster than ESLint",
      id: "oxlint",
      logo: mockSvg,
      name: "Oxlint + Oxfmt",
      subtitle: "The fastest linter available",
      vscodeExtensionId: "oxc.oxc-vscode",
    },
  ],
}));

mock.module("@repo/data/agents", () => ({
  agents: [
    {
      config: { path: ".claude/CLAUDE.md", appendMode: true },
      description: "Anthropic's official CLI for Claude",
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
      id: "claude",
      logo: mockSvg,
      name: "Claude Code",
      subtitle: "Anthropic's agentic CLI",
    },
    {
      config: { path: "AGENTS.md", appendMode: true },
      description: "OpenAI's cloud-based coding agent",
      id: "codex",
      logo: mockSvg,
      name: "Codex",
      subtitle: "OpenAI's coding agent",
    },
    {
      config: { path: "AGENTS.md", appendMode: true },
      description: "Google's asynchronous AI coding agent",
      id: "jules",
      logo: mockSvg,
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
      description: "GitHub's AI pair programmer",
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
      id: "copilot",
      logo: mockSvg,
      name: "GitHub Copilot",
      subtitle: "GitHub's AI pair programmer",
    },
    {
      config: { path: ".clinerules", appendMode: true },
      description: "An autonomous coding agent for VS Code",
      id: "cline",
      logo: mockSvg,
      name: "Cline",
      subtitle: "Autonomous VS Code agent",
    },
    {
      config: { path: ".roo/rules.md", appendMode: true },
      description: "AI code assistant",
      id: "roo-code",
      logo: mockSvg,
      name: "Roo Code",
      subtitle: "AI-powered code assistant",
    },
    {
      config: { path: ".aider/conventions.md", appendMode: true },
      description: "AI pair programming tool",
      id: "aider",
      logo: mockSvg,
      name: "Aider",
      subtitle: "AI pair programming in terminal",
    },
    {
      config: { path: ".gemini/style-guide.md", appendMode: true },
      description: "Google's AI coding assistant",
      id: "gemini",
      logo: mockSvg,
      name: "Gemini Code Assist",
      subtitle: "Google's AI assistant",
    },
    {
      config: { path: ".junie/guidelines.md", appendMode: true },
      description: "JetBrains AI coding assistant",
      id: "junie",
      logo: mockSvg,
      name: "Junie",
      subtitle: "JetBrains AI assistant",
    },
  ],
}));

mock.module("@repo/data/editors", () => ({
  editors: [
    {
      config: {
        path: ".vscode/settings.json",
        getContent: () => ({ ...vscodeBaseConfig, ...vscodeBiomeConfig }),
        extensionCommand: "code --install-extension",
      },
      description: "Popular code editor",
      id: "vscode",
      logo: mockSvg,
      name: "VS Code",
      subtitle: "Microsoft's code editor",
    },
    {
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
      description: "Fast code editor",
      id: "zed",
      logo: mockSvg,
      name: "Zed",
      subtitle: "High-performance code editor",
    },
    {
      config: {
        path: ".vscode/settings.json",
        getContent: () => ({ ...vscodeBaseConfig, ...vscodeBiomeConfig }),
      },
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
      id: "cursor",
      logo: mockSvg,
      name: "Cursor",
      subtitle: "AI-first code editor",
    },
    {
      config: {
        path: ".vscode/settings.json",
        getContent: () => ({ ...vscodeBaseConfig, ...vscodeBiomeConfig }),
      },
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
      id: "windsurf",
      logo: mockSvg,
      name: "Windsurf",
      subtitle: "Codeium's AI editor",
    },
  ],
}));
