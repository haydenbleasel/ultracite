import { mock } from "bun:test";

// Mock the data package modules that contain SVG imports requiring react
// These mocks must be set up before any imports that use these modules
mock.module("@ultracite/data/providers", () => ({
  providers: [
    {
      id: "biome",
      name: "Biome",
      configFiles: [{ name: "biome.jsonc", code: () => "{}" }],
      vscodeExtensionId: "biomejs.biome",
    },
    {
      id: "eslint",
      name: "ESLint",
      configFiles: [{ name: "eslint.config.mjs", code: () => "" }],
      vscodeExtensionId: "dbaeumer.vscode-eslint",
    },
    {
      id: "oxlint",
      name: "Oxlint",
      configFiles: [{ name: ".oxlintrc.json", code: () => "{}" }],
      vscodeExtensionId: "oxc.oxc-vscode",
    },
  ],
}));

mock.module("@ultracite/data/agents", () => ({
  agents: [
    {
      id: "claude",
      name: "Claude Code",
      config: { path: ".claude/CLAUDE.md" },
    },
    {
      id: "cline",
      name: "Cline",
      config: { path: ".clinerules" },
    },
  ],
}));

mock.module("@ultracite/data/editors", () => ({
  editors: [
    {
      id: "vscode",
      name: "VS Code",
      config: { path: ".vscode/settings.json", getContent: () => ({}) },
    },
    {
      id: "zed",
      name: "Zed",
      config: { path: ".zed/settings.json", getContent: () => ({}) },
    },
    {
      id: "cursor",
      name: "Cursor",
      hooks: { path: ".cursor/hooks.json", getContent: () => ({}) },
      config: { path: ".vscode/settings.json", getContent: () => ({}) },
    },
    {
      id: "windsurf",
      name: "Windsurf",
      hooks: { path: ".windsurf/hooks.json", getContent: () => ({}) },
      config: { path: ".vscode/settings.json", getContent: () => ({}) },
    },
  ],
}));
