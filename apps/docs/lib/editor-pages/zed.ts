import type { EditorPageContent } from "./types";

export const zed: EditorPageContent = {
  afterInit: [
    "Trust the project from the warning icon in the title bar. Until you do, Zed skips `.zed/settings.json`.",
    "Install the Oxc extension from `zed: extensions`, or Biome’s if you picked Biome.",
    "Save a file: Oxfmt formats it and Oxlint’s safe fixes apply.",
  ],
  agent: {
    body: "Zed Agent loads `AGENTS.md` as project instructions, and its `diagnostics` tool reads the errors and warnings your language servers report. So after an edit it can check the same Oxlint, Biome or ESLint results you see in the editor. External agents such as Claude and Codex run as their own processes over the Agent Client Protocol and read their own config.",
    lookup: [
      {
        note: "Personal instructions for every project. Project instructions win when the two conflict.",
        path: "~/.config/zed/AGENTS.md",
      },
      {
        note: "Checked first. Zed uses only the first project file it finds, so any of these hides `AGENTS.md`.",
        path: ".rules, .cursorrules, .windsurfrules, .clinerules",
      },
      {
        note: "Also ahead of `AGENTS.md` in Zed’s list.",
        path: ".github/copilot-instructions.md, AGENT.md",
      },
      {
        note: "Where `init` writes Ultracite’s rules. Loaded as project instructions when no file above it exists.",
        path: "AGENTS.md",
      },
      {
        note: "Read only when none of the files above exist.",
        path: "CLAUDE.md, GEMINI.md",
      },
    ],
    steps: [
      "Zed Agent edits a file in your project.",
      "The Oxc, Biome or ESLint language server lints the changed buffer, as it does for your own edits.",
      "The agent can call `diagnostics` on that file to see what the linter reported, then fix it before moving on.",
    ],
    title: "Zed Agent sees the lint errors you see",
  },
  checked: {
    date: "2026-10-10",
    version: "1.23.2",
  },
  faqs: [
    {
      answer:
        "Yes. `npx ultracite init --editors zed` writes `.zed/settings.json` for Oxlint and Oxfmt, Biome, or ESLint and Prettier. Install the Oxc or Biome extension from Zed’s extensions view; ESLint and Prettier are built in.",
      question: "Does Ultracite work with Zed?",
    },
    {
      answer:
        "Zed ignores `.zed/settings.json` and starts no language servers until you trust the project, and Oxlint and Biome need their Zed extension. Trust the folder from the warning icon in the title bar, then check the extension is installed.",
      question: "Why doesn’t Zed format on save after init?",
    },
    {
      answer:
        "Yes, as project instructions, but only when no file ahead of it in Zed’s list exists: `.rules`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md` or `AGENT.md`. Zed uses the first one it finds.",
      question: "Does Zed Agent read AGENTS.md?",
    },
    {
      answer:
        "Yes. `init --linter eslint --editors zed` keeps ESLint’s fixes and import sorting as code actions and makes Prettier the formatter. Zed’s Prettier integration uses your project’s own Prettier install, config and plugins.",
      question: "Can I use ESLint and Prettier in Zed?",
    },
    {
      answer:
        "No. Zed extensions install from its extensions view (`zed: extensions`), and Ultracite doesn’t install any. Zed suggests extensions for the files you open, and its `auto_install_extensions` setting installs the ones you name.",
      question: "Does Ultracite install the Zed extension for me?",
    },
  ],
  headline: "Zed, with your linter as a language server",
  highlights: [
    {
      body: "Zed doesn’t run VS Code extensions, so it gets its own settings file. Oxlint, Oxfmt and Biome come from Zed extensions, and ESLint and Prettier ship with Zed, so the ESLint toolchain needs nothing installed.",
      title: "Not a VS Code fork",
    },
    {
      body: "Zed Agent loads skills from the project’s `.agents/skills/` folder, where `init` installs the Ultracite skill, and from `~/.agents/skills/`. Editing a `SKILL.md` takes effect without restarting the session.",
      title: "The Ultracite skill loads as is",
    },
    {
      body: "Claude, Codex, Gemini CLI and other agents run in Zed’s Agent Panel over the Agent Client Protocol, as separate processes. They read their own instruction files and settings rather than Zed’s, so set them up with `init --agents` as you would in a terminal.",
      title: "External agents keep their own setup",
    },
  ],
  intro:
    "`ultracite init --editors zed` writes `.zed/settings.json`, so Zed formats on save and applies safe fixes through your toolchain’s language server: Oxc’s, Biome’s, or ESLint’s with Prettier. Zed Agent reads `AGENTS.md` and can check its own edits against the same language servers.",
  metaDescription:
    "Ultracite writes .zed/settings.json so Zed formats and fixes on save with Oxlint and Oxfmt, Biome, or ESLint and Prettier, and Zed Agent sees the lint errors.",
  metaTitle: "Ultracite for Zed — Oxlint, Biome or ESLint on save",
  related: ["vscode", "cursor", "devin"],
  setup: {
    facts: [
      {
        label: "Restricted Mode",
        value:
          "Zed opens every new folder in Restricted Mode, which skips `.zed/settings.json` and starts no language servers. Trust the project from the warning icon in the title bar.",
      },
      {
        label: "Oxlint and Oxfmt",
        value:
          "Run through the Oxc extension (`oxc-project/oxc-zed`), which needs Zed 0.205 or later and Oxlint 1.35 or later. Install it from `zed: extensions`.",
      },
      {
        label: "Biome",
        value:
          "Runs through the Biome extension (`biomejs/biome-zed`). `init` points you to it when you pick Biome.",
      },
      {
        label: "ESLint and Prettier",
        value:
          "Built into Zed. Its Prettier integration uses your project’s own Prettier install, config and plugins, as `ultracite fix` does.",
      },
      {
        label: "TypeScript server",
        value:
          "Zed uses vtsls for TypeScript and JavaScript, so Ultracite sets its import preferences under `lsp.vtsls.settings`.",
      },
      {
        label: "Extension prompts",
        value:
          "Zed suggests extensions for the files you open (`suggest_extensions`, on by default), and `auto_install_extensions` installs the ones you list.",
      },
    ],
    summary:
      "Zed runs your toolchain through language servers, which come from Zed extensions or ship with Zed, and it only applies `.zed/settings.json` in a project you trust.",
    title: "Before Zed applies the settings",
  },
  sources: [
    {
      title: "Zed docs: Trusted worktrees",
      url: "https://zed.dev/docs/worktree-trust",
    },
    {
      title: "Zed docs: Instructions",
      url: "https://zed.dev/docs/ai/instructions",
    },
    { title: "Zed docs: Tools", url: "https://zed.dev/docs/ai/tools" },
    { title: "Zed docs: Skills", url: "https://zed.dev/docs/ai/skills" },
    {
      title: "Zed docs: External agents",
      url: "https://zed.dev/docs/ai/external-agents",
    },
    {
      title: "Zed docs: TypeScript",
      url: "https://zed.dev/docs/languages/typescript",
    },
    {
      title: "Oxc extension for Zed",
      url: "https://github.com/oxc-project/oxc-zed",
    },
  ],
};
