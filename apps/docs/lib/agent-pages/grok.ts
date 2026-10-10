import type { AgentPageContent } from "./types";

export const grok: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Yes. At startup it loads every `AGENTS.md` from the repo root down to the working directory, along with any `CLAUDE.md` in the same folders. Startup loading needs folder trust, so trust the project first.",
      question: "Does Grok Build read AGENTS.md?",
    },
    {
      answer:
        "Grok skips project hooks until you trust the folder. Run `/hooks-trust` in the session or start Grok with `--trust`, then open `/hooks` to see the hook in the list.",
      question: "Why isn’t the Ultracite hook running in Grok Build?",
    },
    {
      answer:
        "Grok reads hooks from `.claude/settings.json` too, but a hook with the same event, command and matcher in several files runs once. The hooks `init` writes for Claude Code and Grok Build share all three, so a project with both runs `ultracite fix` once per edit.",
      question: "Will Grok Build also run my Claude Code hook?",
    },
    {
      answer:
        "The tool has already run, so nothing is blocked: Grok hands the hook’s full stderr to the model. That’s a change from earlier versions, where it was a recorded failure, and Grok’s docs warn that a checker using exit 2 for other reasons now reaches the model too.",
      question: "What does exit code 2 mean for a Grok Build PostToolUse hook?",
    },
    {
      answer:
        "Run `grok inspect`. It lists each instructions file Grok found, with its path and an approximate token count.",
      question: "How do I check which rules Grok Build loaded?",
    },
  ],
  headline: "Grok Build edits, fixed before the next step",
  highlights: [
    {
      body: "Grok skips a project’s hooks, startup instructions, skills and `.grok/config.toml` permission rules until you trust the folder. `/hooks-trust` or `--trust` grants them together and records it in `~/.grok/trusted_folders.toml`; headless runs need `--trust` or an earlier grant.",
      title: "One trust grant covers rules and hooks",
    },
    {
      body: "Besides its own files, Grok reads `.claude/rules/` and `.cursor/rules/`, hooks from `.claude/settings.json` and `.cursor/hooks.json`, and permission rules from `.claude/settings.json`. Compatibility with each vendor is on by default and can be turned off in `~/.grok/config.toml`.",
      title: "Claude Code and Cursor setups carry over",
    },
    {
      body: "`grok -p` runs one prompt and exits. For CI, Grok’s docs pair `--always-approve` with `--deny` rules: a deny always wins, and hooks still run in always-approve mode.",
      title: "Headless runs with hard limits",
    },
  ],
  intro:
    "Grok Build reads Ultracite’s rules from `AGENTS.md`, alongside any `CLAUDE.md`, once you trust the folder. `init --hooks grok` adds a `PostToolUse` hook that runs `ultracite fix` on each file Grok edits, and Grok hands what’s left to the model in the same turn.",
  loop: {
    body: "`init --hooks grok` writes `.grok/hooks/ultracite.json` in Claude Code’s hook format. Grok maps the `Write|Edit` matcher onto its own file tools, and when the hook exits with code 2, Grok gives the model its stderr along with the tool result. The allow rule below lets Grok run `npx ultracite` commands of its own without a prompt.",
    snippets: [
      {
        code: '[permission]\nallow = ["Bash(npx ultracite *)"]',
        lang: "toml",
        title: ".grok/config.toml",
      },
    ],
    steps: [
      "Grok edits a file, for example with `search_replace`, which the `Write|Edit` matcher covers.",
      "In a trusted folder, Grok sends the event to the hook as JSON on stdin, and the hook runs `ultracite fix` on that file.",
      "If nothing is left, the hook exits 0 and Grok carries on.",
      "If problems remain, the hook prints them to stderr and exits 2, and the model reads them with the tool result before its next step.",
    ],
    title: "A trusted hook after every file edit",
  },
  metaDescription:
    "Set up Ultracite for Grok Build: rules in AGENTS.md, a PostToolUse hook in .grok/hooks that fixes each edit, and the folder trust both of them need.",
  metaTitle: "Ultracite for Grok Build — A hook on every file edit",
  related: ["codex", "copilot", "droid"],
  rules: {
    facts: [
      {
        label: "File names",
        value:
          "`AGENTS.md`, `Agents.md`, `AGENT.md`, `CLAUDE.md`, `Claude.md` and `CLAUDE.local.md`. Every match in a folder loads.",
      },
      {
        label: "Precedence",
        value:
          "Files load from the root down, so the one nearest the working directory wins a conflict.",
      },
      {
        label: "Size",
        value: "No cap and no truncation: each file loads in full.",
      },
      {
        label: "Gitignore",
        value:
          "Ignored files are skipped, which makes a gitignored `CLAUDE.local.md` a good place for personal notes.",
      },
      {
        label: "Trust",
        value:
          "Project rules load at startup only in a trusted folder: `/hooks-trust`, `--trust` or the trust prompt.",
      },
      {
        label: "Check it",
        value:
          "`grok inspect` lists each rules file Grok found, with its path and approximate token count.",
      },
    ],
    lookup: [
      {
        note: "Your rules for every project, then the `~/.claude/` and `~/.cursor/` equivalents while Claude and Cursor compatibility are on.",
        path: "~/.grok/rules/*.md",
      },
      {
        note: "Every folder from the repo root down to the working directory, in that order. Needs folder trust.",
        path: "AGENTS.md",
      },
      {
        note: "Loaded alongside `AGENTS.md` in the same folder, not instead of it.",
        path: "CLAUDE.md, CLAUDE.local.md, .claude/CLAUDE.md",
      },
      {
        note: "Scanned at each level too, along with `.claude/rules/` and `.cursor/rules/`.",
        path: ".grok/rules/*.md",
      },
      {
        note: "When Grok reads or edits files outside that chain, it notes the instruction files there and reads them when they apply.",
        path: "Folders it visits later",
      },
    ],
    summary:
      "Grok Build loads every recognized instructions file from the repo root down to the working directory, so `AGENTS.md` and `CLAUDE.md` in the same folder both count. Deeper files come later in its context and win when instructions conflict.",
  },
  skills:
    "Grok Build loads skills from `.grok/skills/`, `.claude/skills/` and `.cursor/skills/`, and scans `.agents/skills/` at each level between the working directory and the repo root, so it finds the Ultracite skill `init` installs there. Project skills load only in a trusted folder.",
  sources: [
    {
      title: "Grok Build: Project rules",
      url: "https://docs.x.ai/build/features/project-rules",
    },
    {
      title: "Grok Build: Hooks",
      url: "https://docs.x.ai/build/features/hooks",
    },
    {
      title: "grok-build user guide: Project rules (AGENTS.md)",
      url: "https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/12-project-rules.md",
    },
    {
      title: "grok-build user guide: Hooks",
      url: "https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/10-hooks.md",
    },
    {
      title: "grok-build user guide: Permissions and safety",
      url: "https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/22-permissions-and-safety.md",
    },
    {
      title: "grok-build user guide: Skills",
      url: "https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/08-skills.md",
    },
  ],
};
