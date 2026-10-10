import type { AgentPageContent } from "./types";

export const cursorCli: AgentPageContent = {
  checked: { date: "2026-10-10", version: "2026.09.28" },
  faqs: [
    {
      answer:
        "Yes. The CLI reads `AGENTS.md` and `CLAUDE.md` at the project root and applies them as rules alongside `.cursor/rules`. Nested `AGENTS.md` files apply when the agent works on files in their folder.",
      question: "Does Cursor CLI read AGENTS.md?",
    },
    {
      answer:
        "`agent`. Install it with `curl https://cursor.com/install -fsS | bash`, then run `agent` in your project, or `agent -p` with a prompt for a non-interactive run.",
      question: "What is the Cursor CLI command called?",
    },
    {
      answer:
        "Yes. It runs project hooks from `.cursor/hooks.json` and also reads Claude Code hooks from `.claude/settings.json`. Ultracite’s `--hooks cursor` option writes an `afterFileEdit` hook to `.cursor/hooks.json`, but that event has no output the agent sees, so whatever the fix leaves isn’t passed back.",
      question: "Does Cursor CLI support hooks?",
    },
    {
      answer:
        "Project rules in `.cursor/rules` must be `.mdc` files with frontmatter; a plain `.md` file there is ignored. Put plain Markdown in `AGENTS.md` instead.",
      question: "Why doesn’t Cursor pick up my .md rule?",
    },
    {
      answer:
        "Add a `Shell(...)` entry to `permissions.allow` in `.cursor/cli.json` for the project, or `~/.cursor/cli-config.json` for every project. A permission matches the command’s first token, so `Shell(npx)` allows every `npx` command, not just `ultracite`.",
      question: "How do I stop the agent asking before every lint?",
    },
  ],
  headline: "Cursor CLI applies AGENTS.md as a rule",
  highlights: [
    {
      body: "The CLI reads hooks from `.claude/settings.json` as well as `.cursor/hooks.json` and merges them. If you’ve set up Ultracite’s Claude Code hook, the Cursor CLI loads that file too.",
      title: "It reads Claude Code hooks",
    },
    {
      body: "Cursor’s `afterFileEdit` hook gets the edited file’s path, which is what `init --hooks cursor` uses, but it has no output the agent reads. `postToolUse` is the event that can add `additional_context` after a tool result.",
      title: "afterFileEdit can’t talk back",
    },
    {
      body: "Start a message with `&` to send the session to a Cloud Agent. Cloud agents run the project’s `.cursor/hooks.json`, including `afterFileEdit`, but not hooks from your home directory, and none during early read-only turns.",
      title: "Cloud handoff keeps project hooks",
    },
  ],
  intro:
    "The Cursor CLI (`agent`) reads `AGENTS.md` and `CLAUDE.md` at the project root and applies them as rules alongside `.cursor/rules`, so Ultracite’s rules load with no extra file. Ultracite doesn’t add a Cursor CLI hook: the agent runs `ultracite fix` and `ultracite check` because the rules say to, once you approve the command or allow it in `.cursor/cli.json`.",
  loop: {
    body: "The CLI asks before it runs a terminal command unless a permission covers it. The rules give the agent `ultracite fix` and `ultracite check`, so approving them, or allowing them in `.cursor/cli.json`, is all the setup the loop needs.",
    steps: [
      "The agent edits a file in your project, or in a separate worktree with `--worktree`.",
      "Following `AGENTS.md`, it proposes `npx ultracite fix` or `npx ultracite check`.",
      "You approve it, or a `Shell(...)` permission in `.cursor/cli.json` lets it run without asking.",
      "The agent reads the linter’s output and fixes what’s left.",
    ],
    title: "A Shell permission for ultracite",
  },
  metaDescription:
    "Set up Ultracite for Cursor CLI: AGENTS.md applied as a rule beside .cursor/rules, the skill in .agents/skills, and a Shell permission for ultracite.",
  metaTitle: "Ultracite for Cursor CLI — AGENTS.md, rules and permissions",
  related: ["claude", "codex", "copilot"],
  rules: {
    facts: [
      {
        label: "Project rules",
        value:
          "`.mdc` files in `.cursor/rules` with `description`, `globs` and `alwaysApply`. A plain `.md` file there is ignored; plain Markdown belongs in `AGENTS.md`.",
      },
      {
        label: "Nesting",
        value:
          "An `AGENTS.md` in a subdirectory applies to files there, combined with its parents’; the more specific one wins.",
      },
      {
        label: "Precedence",
        value:
          "Team rules, then project rules, then user rules. All are merged, and earlier sources win on conflicts.",
      },
      {
        label: "Size",
        value:
          "Cursor suggests keeping each rule under 500 lines. Ultracite’s rules are about 125.",
      },
      {
        label: "File references",
        value:
          "`@path` in a rule points the agent at a file it reads when needed. The file isn’t inlined.",
      },
      {
        label: "Check it",
        value:
          "`/rules` in the CLI opens an interactive browser of your rules, with inline editing.",
      },
    ],
    lookup: [
      {
        note: "On Team and Enterprise plans. They take precedence over project rules, and enforced ones can’t be turned off.",
        path: "Team rules",
      },
      {
        note: "Project rules. Only `.mdc` files with frontmatter count, and `.cursor/rules` folders in subdirectories are found too.",
        path: ".cursor/rules/*.mdc",
      },
      {
        note: "At the project root, applied as a rule alongside `.cursor/rules`. This is where `init` writes Ultracite’s rules.",
        path: "AGENTS.md",
      },
      {
        note: "Also read at the project root and applied the same way.",
        path: "CLAUDE.md",
      },
      {
        note: "A subdirectory’s file, applied when the agent works on files in that folder or below it.",
        path: "src/**/AGENTS.md",
      },
      {
        note: "Your preferences from Customize → Rules, used in every project, with the lowest precedence.",
        path: "User rules",
      },
    ],
    summary:
      "Cursor merges every rule that applies, with team rules taking precedence over project rules and project rules over user rules. `AGENTS.md` needs no frontmatter: it’s plain Markdown that the CLI applies as a rule.",
  },
  skills:
    "The Cursor CLI loads skills from `.agents/skills/` and `.cursor/skills/`, and for compatibility from `.claude/skills/` and `.codex/skills/`, in interactive and headless runs. `init` installs the Ultracite skill into `.agents/skills/`, so the agent finds it; type `/` to pick it.",
  sources: [
    {
      title: "Cursor CLI: Using Agent in CLI",
      url: "https://cursor.com/docs/cli/using",
    },
    {
      title: "Cursor: Rules",
      url: "https://cursor.com/docs/rules",
    },
    {
      title: "Cursor: Hooks",
      url: "https://cursor.com/docs/hooks",
    },
    {
      title: "Cursor: Agent Skills",
      url: "https://cursor.com/docs/skills",
    },
    {
      title: "Cursor CLI: Permissions",
      url: "https://cursor.com/docs/cli/reference/permissions",
    },
    {
      title: "Cursor CLI: Changelog",
      url: "https://cursor.com/docs/cli/changelog",
    },
  ],
};
