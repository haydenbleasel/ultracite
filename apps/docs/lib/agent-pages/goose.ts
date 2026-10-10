import type { AgentPageContent } from "./types";

export const goose: AgentPageContent = {
  checked: { date: "2026-10-10", version: "1.54.0" },
  faqs: [
    {
      answer:
        "Yes. `AGENTS.md` and `.goosehints` are its default context files, loaded at every level from the git root down to your working directory, plus `~/.config/goose/AGENTS.md` and `~/.agents/AGENTS.md` globally.",
      question: "Does goose read AGENTS.md?",
    },
    {
      answer:
        'Not by default. Set `CONTEXT_FILE_NAMES` to a JSON array such as `["CLAUDE.md", "AGENTS.md"]`; the setting replaces the defaults, so keep `AGENTS.md` in it or goose stops reading Ultracite’s rules.',
      question: "Does goose read CLAUDE.md?",
    },
    {
      answer:
        "Yes, through plugins: a `hooks/hooks.json` in `.agents/plugins/<name>/` or `~/.agents/plugins/<name>/`. Only `PreToolUse` and `Stop` hooks can block; `PostToolUse` and `AfterFileEdit` results are logged and ignored, so they can’t hand lint problems back. Ultracite doesn’t configure goose hooks.",
      question: "Does goose support hooks?",
    },
    {
      answer:
        "Either works, and goose reads both. `ultracite init` writes `AGENTS.md`, which other agents read too; keep notes only goose needs in `.goosehints`.",
      question: "Should I use .goosehints or AGENTS.md?",
    },
    {
      answer:
        "Switch modes with `/mode smart_approve` or `/mode approve` in the CLI, or set Default Mode under Settings, Chat in the desktop app. goose then asks for tools it judges to be writes, a call the model makes on a best-effort basis.",
      question: "How do I make goose ask before running commands?",
    },
  ],
  headline: "goose loads AGENTS.md from the git root down",
  highlights: [
    {
      body: "goose starts in Autonomous mode, so it edits files and runs commands, `ultracite fix` included, without asking. Smart Approve and Manual Approval ask for tools the model judges to be writes; Chat Only runs nothing.",
      title: "Autonomous unless you change it",
    },
    {
      body: "Hints load once per session and can fade as context fills. A file named in `GOOSE_MOIM_MESSAGE_FILE` is re-read and injected on every turn, up to 64 KB, which suits the one rule you never want dropped.",
      title: "Instructions it re-reads every turn",
    },
    {
      body: '`CONTEXT_FILE_NAMES` replaces goose’s list of context files rather than adding to it. Set it to `["CLAUDE.md"]` and goose stops reading `AGENTS.md`, and with it Ultracite’s rules.',
      title: "Custom context names replace the default",
    },
  ],
  intro:
    "goose reads Ultracite’s rules from `AGENTS.md`, one of its two default context files, at every level from the git root down to your working directory. It runs in Autonomous mode by default, so when the rules say to run `ultracite fix` after editing, it runs it without asking and fixes what’s left.",
  loop: {
    body: "Ultracite doesn’t add a goose hook, so after an edit goose runs the commands in `AGENTS.md`. goose’s own hooks live in plugin folders, but `PostToolUse` and `AfterFileEdit` only observe; only `PreToolUse` and `Stop` can change what goose does next.",
    steps: [
      "goose edits a file with the developer extension’s `write` or `edit` tool.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` with `shell`.",
      "In Autonomous mode nothing asks; in Smart Approve or Manual Approval, goose asks for tools it judges to be writes.",
      "goose reads the output and fixes what’s left.",
    ],
    title: "Autonomous by default, so the fix just runs",
  },
  metaDescription:
    "Set up Ultracite for goose: rules in AGENTS.md, which goose loads from the git root down to your folder, and how its approval modes and hooks affect linting.",
  metaTitle: "Ultracite for goose — AGENTS.md hints, modes and hooks",
  related: ["crush", "open-hands", "codex"],
  rules: {
    facts: [
      {
        label: "Default files",
        value:
          "`AGENTS.md` and `.goosehints`; goose loads both when a folder has both.",
      },
      {
        label: "Conflicts",
        value:
          "Local hints win over global ones; nested hints combine with their parents.",
      },
      {
        label: "Shared global",
        value:
          "`~/.agents/AGENTS.md` loads as a global hint while `AGENTS.md` is in your context file list.",
      },
      {
        label: "Edits",
        value:
          "Hints load at session start; restart the session to pick up a changed file.",
      },
      {
        label: "Large files",
        value:
          "`@README.md` pulls a file in; a plain path only tells goose where to look.",
      },
      {
        label: "Desktop",
        value:
          "Settings, Chat, Project Hints opens the project’s hints in goose Desktop.",
      },
    ],
    lookup: [
      {
        note: "Global hints, along with `~/.config/goose/.goosehints`.",
        path: "~/.config/goose/AGENTS.md",
      },
      {
        note: "A global file other agents share, read when `AGENTS.md` is in your context file list.",
        path: "~/.agents/AGENTS.md",
      },
      {
        note: "At each level from the git root down to the working directory; outside a git repo, only the working directory.",
        path: "AGENTS.md and .goosehints",
      },
      {
        note: "A deeper folder’s files, loaded the first time goose reads or edits a file there, or names one in a shell command.",
        path: "packages/web/AGENTS.md",
      },
    ],
    summary:
      "goose calls these files hints. It loads global hints, then every `AGENTS.md` and `.goosehints` from the git root down to where you started, and adds a deeper folder’s files once it works there.",
  },
  skills:
    "goose loads skills from `.agents/skills/` in the project and `~/.agents/skills/`, so it finds the Ultracite skill that `init` installs; `init` also installs it into goose’s own folder when the project has a `.goose` directory. Run `goose skills list` to check.",
  sources: [
    {
      title: "goose: Using goosehints",
      url: "https://goose-docs.ai/docs/guides/context-engineering/using-goosehints",
    },
    {
      title: "goose: Hooks",
      url: "https://goose-docs.ai/docs/guides/context-engineering/hooks",
    },
    {
      title: "goose: Permission modes",
      url: "https://goose-docs.ai/docs/guides/managing-tools/goose-permissions",
    },
    {
      title: "goose: Persistent instructions",
      url: "https://goose-docs.ai/docs/guides/context-engineering/using-persistent-instructions",
    },
    {
      title: "goose: Using skills",
      url: "https://goose-docs.ai/docs/guides/context-engineering/using-skills",
    },
    {
      title: "goose source: hint loading",
      url: "https://github.com/aaif-goose/goose/blob/main/crates/goose/src/hints/load_hints.rs",
    },
  ],
};
