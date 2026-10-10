import type { AgentPageContent } from "./types";

export const claude: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Both, but not at once by default. Claude Code reads `AGENTS.md` (since v2.1.277) only when there’s no `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` in your working directory or above it. When your project has a `CLAUDE.md`, `ultracite init --agents claude` adds an `@AGENTS.md` import to it, so Claude loads both.",
      question: "Does Claude Code read AGENTS.md or CLAUDE.md?",
    },
    {
      answer:
        "It prints what `ultracite fix` couldn’t settle to stderr and exits with code 2. Claude Code shows a `PostToolUse` hook’s stderr to Claude on that exit code, so Claude sees the remaining problems in the same turn and fixes them before moving on.",
      question: "How does the hook tell Claude what’s left?",
    },
    {
      answer:
        "Run `npx ultracite fix --claude`. After the safe fixes, it hands each file with problems left to the Claude Code CLI (`claude -p` in `acceptEdits` mode, limited to reading and editing files), then lints again, so the result decides what counts as fixed.",
      question: "Can Claude fix what autofix can’t, outside a session?",
    },
    {
      answer:
        "Run `/context` in a session and look under Memory files. `AGENTS.md` shows there when Claude reads it directly; with a `CLAUDE.md` that imports it, the import is expanded into that file.",
      question: "How do I check Claude loaded the rules?",
    },
    {
      answer:
        "Yes, unless you’ve turned it off. Running `init` again takes Ultracite’s block out of the `.claude/CLAUDE.md` earlier versions wrote, removes the file if nothing else is left in it, and imports `AGENTS.md` from whatever `CLAUDE.md` remains, because a leftover `.claude/CLAUDE.md` stops Claude from reading `AGENTS.md`.",
      question:
        "I set Ultracite up for Claude before. Do I need to do anything?",
    },
  ],
  headline: "Claude Code, held to your lint rules",
  highlights: [
    {
      body: "Claude Code loads a subdirectory’s `CLAUDE.md` (or `AGENTS.md`, when it has no `CLAUDE.md`) the first time Claude reads or edits a file there, so a workspace’s own instructions arrive with its code.",
      title: "Nested instructions load on demand",
    },
    {
      body: "Files in `.claude/rules/` with a `paths` field load only when Claude works on matching files. Ultracite’s rules apply everywhere, so they stay in `AGENTS.md`; framework-specific notes of your own fit well in a path-scoped rule.",
      title: "Path-scoped rules for the rest",
    },
    {
      body: "An `@path` import resolves relative to the file it’s in and can nest four levels deep. That’s why the import in `.claude/CLAUDE.md` is `@../AGENTS.md`.",
      title: "Imports are relative",
    },
  ],
  intro:
    "Claude Code reads Ultracite’s rules from `AGENTS.md`, or through an import when your project has its own `CLAUDE.md`. A `PostToolUse` hook runs `ultracite fix` on every file Claude writes and hands back what’s left, so Claude fixes it in the same turn.",
  loop: {
    body: "`init --hooks claude` adds a `PostToolUse` hook for Claude’s `Write` and `Edit` tools. It fixes only the file Claude touched, and when problems remain it exits with code 2, which Claude Code turns into feedback Claude reads before its next step.",
    steps: [
      "Claude writes or edits a file with its `Write` or `Edit` tool.",
      "Claude Code runs the hook, which reads the edited file’s path from the hook payload and runs `ultracite fix` on just that file.",
      "Safe fixes and formatting are applied. If nothing is left, the hook exits 0 and Claude carries on.",
      "If problems remain, the hook prints them to stderr and exits 2, and Claude reads them and fixes them before its next step.",
    ],
    title: "A hook on every Write and Edit",
  },
  metaDescription:
    "Set up Ultracite for Claude Code: rules in AGENTS.md, imported from CLAUDE.md when you have one, and a PostToolUse hook that fixes every edit.",
  metaTitle: "Ultracite for Claude Code — Lint every edit Claude makes",
  related: ["codex", "opencode", "copilot"],
  rules: {
    facts: [
      {
        label: "Project file",
        value:
          "`CLAUDE.md` or `.claude/CLAUDE.md`, or `AGENTS.md` when neither exists.",
      },
      {
        label: "Personal",
        value:
          "`~/.claude/CLAUDE.md` for every project and a gitignored `CLAUDE.local.md` for one. Both load alongside `AGENTS.md`, except that `CLAUDE.local.md` counts as a `CLAUDE.md`.",
      },
      {
        label: "Size",
        value:
          "Aim for under 200 lines per file: longer files cost context and adherence. Imports don’t reduce that, since imported files load at launch too.",
      },
      {
        label: "Imports",
        value:
          "`@path` lines expand at launch, up to four levels deep. A path outside the project asks for approval once.",
      },
      {
        label: "Both at once",
        value:
          "Set Project instructions to `claude-md-and-agents-md` in `/config` to load both files without an import. It’s a personal setting, not a project one.",
      },
      {
        label: "Check it",
        value: "`/context` lists every instructions file Claude loaded.",
      },
    ],
    lookup: [
      {
        note: "Your organization’s managed policy, when there is one.",
        path: "Managed CLAUDE.md",
      },
      {
        note: "Your instructions for every project.",
        path: "~/.claude/CLAUDE.md",
      },
      {
        note: "The project’s own instructions, from the working directory up. If either exists, Claude reads them instead of AGENTS.md.",
        path: "CLAUDE.md or .claude/CLAUDE.md",
      },
      {
        note: "Read when the project has no `CLAUDE.md`, or through an `@AGENTS.md` import when it does.",
        path: "AGENTS.md",
      },
      {
        note: "A subdirectory’s instructions, loaded when Claude first reads or edits a file there.",
        path: "src/**/CLAUDE.md",
      },
    ],
    summary:
      "Claude Code builds its instructions from a stack of files, broadest first. `AGENTS.md` sits in the middle of it, as the project’s instructions whenever there’s no `CLAUDE.md` to take that place.",
  },
  skills:
    "Claude Code loads skills from `.claude/skills/`. When `init` installs the Ultracite skill in a project with a `.claude` folder, it installs it there, so Claude knows how to run `init`, `check`, `fix` and `doctor`.",
  sources: [
    {
      title: "Claude Code: How Claude remembers your project",
      url: "https://code.claude.com/docs/en/memory",
    },
    {
      title: "Claude Code: Hooks reference",
      url: "https://code.claude.com/docs/en/hooks",
    },
    {
      title: "Claude Code: Skills",
      url: "https://code.claude.com/docs/en/skills",
    },
    {
      title: "Ultracite: Agent hooks",
      url: "https://www.ultracite.ai/docs/ai/hooks",
    },
  ],
};
