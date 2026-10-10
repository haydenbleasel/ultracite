import type { EditorPageContent } from "./types";

export const trae: EditorPageContent = {
  afterInit: [
    "In Trae’s IDE window, install `oxc.oxc-vscode` from the Extensions view, or Biome’s if you picked Biome. If the store doesn’t list it, install its `.vsix` with ··· → Install from VSIX.",
    "If you also ran `--agents`, turn on “Include AGENTS.md in the context” under Settings → Rules & Memories → Import Settings.",
    "Save a file: Oxfmt formats it and Oxlint’s safe fixes apply.",
  ],
  agent: {
    body: "Trae’s built-in Agent reads project rules from `.trae/rules/`, and `AGENTS.md` only once you turn on “Include AGENTS.md in the context”. With Auto Fix Lints on (SOLO mode always has it on), it fixes code style issues it finds during a chat, and `#Problems` hands it everything in the Problems panel. Ultracite writes no hook for Trae, so nothing runs `ultracite fix` after an edit unless the agent does.",
    lookup: [
      {
        note: "Your global rules for every project, created under Settings → Rules & Memories.",
        path: "~/.trae/user_rules",
      },
      {
        note: "Project rules in Markdown, each set to Always Apply, Apply to Specific Files, Apply Intelligently or Apply Manually. Subfolders are read up to three levels deep.",
        path: ".trae/rules/",
      },
      {
        note: "Read from the project root once “Include AGENTS.md in the context” is on. Where `init` writes Ultracite’s rules.",
        path: "AGENTS.md",
      },
      {
        note: "Read from the project root once “Include CLAUDE.md in context” is on.",
        path: "CLAUDE.md, CLAUDE.local.md",
      },
      {
        note: "Rules in a subfolder apply only when the agent reads, or you mention, files in that folder.",
        path: "web/AGENTS.md, web/.trae/rules/",
      },
    ],
    steps: [
      "The Agent writes an edit to a file in your project.",
      "The Oxc, Biome or ESLint extension lints the file and lists what it finds in the Problems panel, as it does for your own edits.",
      "With Auto Fix Lints on, the Agent fixes the code style issues it finds during the chat.",
      "To hand it everything at once, add `#Problems` to your message. No `ultracite fix --hook` runs, because `init` writes no Trae hook.",
    ],
    title: "Two switches decide what Trae’s agent sees",
  },
  checked: {
    date: "2026-10-10",
    version: "3.6.2",
  },
  faqs: [
    {
      answer:
        "Yes. `npx ultracite init --editors trae` writes `.vscode/settings.json` for Oxlint and Oxfmt, Biome, or ESLint and Prettier. Install the matching extension in Trae’s IDE window, then saving a file formats it and applies the linter’s safe fixes.",
      question: "Does Ultracite work with Trae?",
    },
    {
      answer:
        "Yes, from the project root, once you turn on “Include AGENTS.md in the context” under Settings → Rules & Memories → Import Settings. An `AGENTS.md` in a subfolder applies when the agent reads or you mention files in that folder.",
      question: "Does Trae read AGENTS.md?",
    },
    {
      answer:
        "`init` doesn’t run a launcher for Trae, so it asks you to install the extension. Install it from the Extensions view in the IDE window, or bring it over from VS Code or Cursor with Import Configuration.",
      question: "Why didn’t init install the Oxc extension in Trae?",
    },
    {
      answer:
        "Run it in your own terminal instead. In Manual Approval and Automatic Approval modes, the agent’s commands run in a sandbox that can’t write to `.vscode`, `.trae` or `.git`, so it can’t create `.vscode/settings.json`.",
      question: "Can Trae’s agent run ultracite init for me?",
    },
    {
      answer:
        "Through two features. Add `#Problems` to a message and the agent gets every issue in the Problems panel; turn on Auto Fix Lints and it fixes the code style issues it finds during a chat.",
      question: "Does Trae’s agent see Oxlint or ESLint errors?",
    },
    {
      answer:
        "Not from Ultracite. Trae runs hooks from `.trae/hooks.json`, including `PostToolUse` after a tool call, but `init --hooks` doesn’t support Trae.",
      question: "Does Ultracite add a hook for Trae’s agent?",
    },
  ],
  headline: "Trae, where AGENTS.md is a switch you turn on",
  highlights: [
    {
      body: "Trae loads skills from `.trae/skills/`, and from `.agents/skills/`, where `init` installs the Ultracite skill, only after you turn on “Enable .agents Skills Directory” under Settings → Skills & Commands. A skill with the same name in `.trae/skills/` wins.",
      title: "The Ultracite skill needs a switch too",
    },
    {
      body: "Trae runs hooks from `.trae/hooks.json` and `~/.trae/hooks.json`. A `PostToolUse` hook can match tool names such as `Write` and `Edit`, and exit code 2 passes its stderr to the model. Trae can also import Claude Code’s hooks. Ultracite doesn’t write Trae hooks.",
      title: "Its own hooks, which you set up",
    },
    {
      body: "Trae writes the agent’s code to disk before you review it. Code Review in Settings → Conversation sets what you review: every change, only the latest message’s, or nothing, which keeps them all.",
      title: "Agent edits land before review",
    },
  ],
  intro:
    "`ultracite init --editors trae` writes `.vscode/settings.json`, so Trae’s IDE window formats on save and applies safe fixes through the Oxc, Biome or ESLint extension. Trae’s agent reads `AGENTS.md` only after you switch it on, and its Auto Fix Lints setting has it fix the code style issues it finds.",
  metaDescription:
    "Ultracite writes .vscode/settings.json so Trae formats and fixes on save with Oxlint, Biome or ESLint, and shows what Trae’s agent needs to read AGENTS.md.",
  metaTitle: "Ultracite for Trae — IDE window, AGENTS.md and the sandbox",
  related: ["codebuddy", "cursor", "vscode"],
  setup: {
    facts: [
      {
        label: "Extension store",
        value:
          "Trae’s own store, in the IDE window’s Extensions view. If an extension isn’t listed, Trae’s docs show downloading its `.vsix` from the VS Code Marketplace and dragging it into the store.",
      },
      {
        label: "Launcher",
        value:
          "Trae ships a `trae` command, built from VS Code’s command-line tool, that takes `--install-extension`. `init` doesn’t call it, so it asks you to install the extension.",
      },
      {
        label: "VS Code base",
        value:
          "Trae 3.6.2 is built on VS Code 1.107.1 and applies `.vscode/settings.json` as VS Code does. The Oxc, Biome, ESLint and Prettier extensions all support that version.",
      },
      {
        label: "Agent sandbox",
        value:
          "In Manual Approval and Automatic Approval modes, agent commands run in a sandbox that can’t write to `.vscode`, `.trae` or `.git`. Run `npx ultracite init` in your own terminal.",
      },
      {
        label: "Two windows",
        value:
          "Since 3.6.0, Trae has an Agent window for tasks across projects next to the IDE window. Rules, skills and settings sync between them; VS Code extensions run in the IDE window.",
      },
      {
        label: "Import from VS Code",
        value:
          "Settings → General → Import Configuration copies extensions, settings, snippets and shortcuts from VS Code or Cursor. It overwrites Trae’s own and can’t be undone.",
      },
    ],
    summary:
      "Trae is a VS Code build with its own extension store, and its IDE window applies the `.vscode/settings.json` that `init` writes. Its agent’s sandbox, on in Manual and Automatic Approval modes, keeps `.vscode` read-only.",
    title: "Extensions, launcher and the agent sandbox",
  },
  sources: [
    {
      title: "TRAE docs: Manage extensions",
      url: "https://docs.trae.ai/ide/manage-extensions",
    },
    { title: "TRAE docs: Rules", url: "https://docs.trae.ai/ide/rules" },
    { title: "TRAE docs: Skills", url: "https://docs.trae.ai/ide/skills" },
    {
      title: "TRAE docs: Hook configuration reference",
      url: "https://docs.trae.ai/ide/hook-configuration-reference",
    },
    {
      title: "TRAE docs: Permission approval overview",
      url: "https://docs.trae.ai/ide/permission-and-approval",
    },
    {
      title: "TRAE docs: IDE settings overview",
      url: "https://docs.trae.ai/ide/ide-settings-overview",
    },
    {
      title: "TRAE docs: Changelog",
      url: "https://docs.trae.ai/ide/changelog",
    },
  ],
};
