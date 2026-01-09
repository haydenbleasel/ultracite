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
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit",
  },
};

// Mock the data package modules that contain SVG imports requiring react
// These mocks must be set up before any imports that use these modules
mock.module("@repo/data/providers", () => ({
  providers: [
    {
      configFiles: [{ code: () => "{}", lang: "json", name: "biome.jsonc" }],
      description: "Fast formatter and linter written in Rust",
      id: "biome",
      logo: mockSvg,
      name: "Biome",
      subtitle: "The modern all-in-one toolchain",
      vscodeExtensionId: "biomejs.biome",
    },
    {
      configFiles: [
        { code: () => "", lang: "javascript", name: "eslint.config.mjs" },
        { code: () => "", lang: "javascript", name: "prettier.config.mjs" },
        { code: () => "", lang: "javascript", name: "stylelint.config.mjs" },
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
        { code: () => "{}", lang: "json", name: ".oxlintrc.json" },
        { code: () => "{}", lang: "json", name: ".oxfmtrc.jsonc" },
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
      config: { appendMode: true, path: ".claude/CLAUDE.md" },
      description: "Anthropic's official CLI for Claude",
      hooks: {
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
        path: ".claude/settings.json",
      },
      id: "claude",
      logo: mockSvg,
      name: "Claude Code",
      subtitle: "Anthropic's agentic CLI",
    },
    {
      config: { appendMode: true, path: "AGENTS.md" },
      description: "OpenAI's cloud-based coding agent",
      id: "codex",
      logo: mockSvg,
      name: "Codex",
      subtitle: "OpenAI's coding agent",
    },
    {
      config: { appendMode: true, path: "AGENTS.md" },
      description: "Google's asynchronous AI coding agent",
      id: "jules",
      logo: mockSvg,
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
      description: "GitHub's AI pair programmer",
      id: "copilot",
      logo: mockSvg,
      name: "GitHub Copilot",
      subtitle: "GitHub's AI pair programmer",
    },
    {
      config: { appendMode: true, path: ".clinerules" },
      description: "An autonomous coding agent for VS Code",
      id: "cline",
      logo: mockSvg,
      name: "Cline",
      subtitle: "Autonomous VS Code agent",
    },
    {
      config: { appendMode: true, path: ".roo/rules.md" },
      description: "AI code assistant",
      id: "roo-code",
      logo: mockSvg,
      name: "Roo Code",
      subtitle: "AI-powered code assistant",
    },
    {
      config: { appendMode: true, path: ".aider/conventions.md" },
      description: "AI pair programming tool",
      id: "aider",
      logo: mockSvg,
      name: "Aider",
      subtitle: "AI pair programming in terminal",
    },
    {
      config: { appendMode: true, path: ".gemini/style-guide.md" },
      description: "Google's AI coding assistant",
      id: "gemini",
      logo: mockSvg,
      name: "Gemini Code Assist",
      subtitle: "Google's AI assistant",
    },
    {
      config: { appendMode: true, path: ".junie/guidelines.md" },
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
        extensionCommand: "code --install-extension",
        getContent: () => ({ ...vscodeBaseConfig, ...vscodeBiomeConfig }),
        path: ".vscode/settings.json",
      },
      description: "Popular code editor",
      id: "vscode",
      logo: mockSvg,
      name: "VS Code",
      subtitle: "Microsoft's code editor",
    },
    {
      config: {
        getContent: () => ({
          formatter: "language_server",
          format_on_save: "on",
          languages: {
            JavaScript: {
              formatter: { language_server: { name: "biome" } },
            },
          },
        }),
        path: ".zed/settings.json",
      },
      description: "Fast code editor",
      id: "zed",
      logo: mockSvg,
      name: "Zed",
      subtitle: "High-performance code editor",
    },
    {
      config: {
        getContent: () => ({ ...vscodeBaseConfig, ...vscodeBiomeConfig }),
        path: ".vscode/settings.json",
      },
      description: "AI-powered code editor",
      hooks: {
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
        path: ".cursor/hooks.json",
      },
      id: "cursor",
      logo: mockSvg,
      name: "Cursor",
      subtitle: "AI-first code editor",
    },
    {
      config: {
        getContent: () => ({ ...vscodeBaseConfig, ...vscodeBiomeConfig }),
        path: ".vscode/settings.json",
      },
      description: "AI-powered editor by Codeium",
      hooks: {
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
        path: ".windsurf/hooks.json",
      },
      id: "windsurf",
      logo: mockSvg,
      name: "Windsurf",
      subtitle: "Codeium's AI editor",
    },
  ],
}));
