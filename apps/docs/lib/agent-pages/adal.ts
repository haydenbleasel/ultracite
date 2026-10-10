import type { AgentPageContent } from "./types";

export const adal: AgentPageContent = {
  checked: { date: "2026-10-10", version: "1.9.0" },
  faqs: [
    {
      answer:
        "Yes. Put it at the workspace root: AdaL reads it every turn and injects it as project instructions, in interactive sessions and headless `adal -q` runs alike.",
      question: "Does AdaL read AGENTS.md?",
    },
    {
      answer:
        "Yes, in `~/.adal/settings.json` only; project and plugin hooks aren’t available yet. They use Claude Code’s event names, and a `PostToolUse` hook adds context to the tool result through stdout on exit 0. Ultracite doesn’t configure them.",
      question: "Does AdaL support hooks?",
    },
    {
      answer:
        "No. A prompt file replaces AdaL’s default role prompt, but `AGENTS.md` still loads as project context alongside it.",
      question: "Does --prompt-file drop the rules in AGENTS.md?",
    },
    {
      answer:
        'Use headless mode: `adal -q "…"` runs a prompt without the interactive UI, and `--yolo` lets every tool call run without asking. AdaL follows `AGENTS.md` there as it does interactively.',
      question: "Can AdaL run Ultracite in CI?",
    },
  ],
  headline: "AdaL rereads AGENTS.md on every turn",
  highlights: [
    {
      body: "In `default` mode, AdaL runs reads, searches, read-only shell commands and project test, build and lint runners without asking, and asks before file edits and other shell commands. `acceptEdits` also lets edits through, and “allow always” covers one command prefix for the rest of the session.",
      title: "Lint runners can skip the prompt",
    },
    {
      body: "AdaL uses Jev to notice when a model stops before the task is finished, and nudges the agent to keep going instead of handing back a half-done turn.",
      title: "Unfinished replies get a nudge",
    },
    {
      body: "AdaL’s worktree tool puts parallel work in `.agents/worktrees/<name>/` on its own branch, inside your project. Add `.agents/worktrees/` to `.gitignore`, as AdaL’s docs advise, so those copies don’t show up as untracked files.",
      title: "Worktrees live inside your project",
    },
  ],
  intro:
    "AdaL reads the `AGENTS.md` at your workspace root on every turn, so Ultracite’s rules stay in front of it for the whole session. Ultracite doesn’t configure AdaL’s hooks, so the agent runs `ultracite fix` through its `bash` tool when the rules tell it to.",
  loop: {
    body: "AdaL runs `ultracite fix` because `AGENTS.md` tells it to. Its hooks live only in `~/.adal/settings.json`: a `PostToolUse` hook can add context to a tool result through stdout on exit 0, while exit 2 blocks only `PreToolUse` and `UserPromptSubmit`. Ultracite doesn’t configure them.",
    steps: [
      "AdaL changes a file with `create_file`, `replace_by_string`, `rewrite_file` or `delete_lines`.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` with `bash`.",
      "Your permission mode decides whether it asks first; `--yolo` runs everything.",
      "It reads the output and fixes what’s left before it answers.",
    ],
    title: "Rules every turn, commands through bash",
  },
  metaDescription:
    "Set up Ultracite for AdaL: rules in the AGENTS.md it reads every turn, approvals for running npx ultracite, and what its user-level hooks can do.",
  metaTitle: "Ultracite for AdaL — AGENTS.md on every turn",
  related: ["droid", "qwen", "kimi-code"],
  rules: {
    facts: [
      {
        label: "Every turn",
        value: "AdaL reads `AGENTS.md` on each turn, not once per session.",
      },
      {
        label: "/init",
        value:
          "`/init` analyzes the codebase and creates an `AGENTS.md`. If you run it after Ultracite, check its rules are still there; `npx ultracite init` adds them back.",
      },
      {
        label: "Prompt files",
        value:
          "`--prompt-file` replaces the default role prompt for a run. `AGENTS.md` still loads as project context.",
      },
    ],
    lookup: [
      {
        note: "AdaL’s general-purpose instructions, unless `--prompt-file` replaces them.",
        path: "Default system prompt",
      },
      {
        note: "At the workspace root, read every turn and injected as project instructions.",
        path: "AGENTS.md",
      },
      {
        note: "A hook in `~/.adal/settings.json` whose output is prepended to each prompt you send.",
        path: "UserPromptSubmit hook",
      },
    ],
    summary:
      "AdaL has one project instructions file: `AGENTS.md` at the workspace root, injected every turn as project context. A custom prompt file changes AdaL’s role, not the project rules.",
  },
  skills:
    "AdaL loads skills from `~/.adal/skills/`, the project’s `.adal/skills/` and installed plugins, not from `.agents/skills/`. When you choose AdaL, `init` installs the Ultracite skill into `.adal/skills/` as well.",
  sources: [
    {
      title: "AdaL: Custom system prompt",
      url: "https://docs.sylph.ai/customize/custom-system-prompt",
    },
    {
      title: "AdaL: Lifecycle hooks",
      url: "https://docs.sylph.ai/customize/lifecycle-hooks",
    },
    {
      title: "AdaL: Built-in tools",
      url: "https://docs.sylph.ai/features/built-in-tools",
    },
    {
      title: "AdaL: Skills and plugins",
      url: "https://docs.sylph.ai/customize/plugins-and-skills",
    },
    {
      title: "AdaL: Worktrees",
      url: "https://docs.sylph.ai/features/worktrees",
    },
    {
      title: "AdaL: Changelog",
      url: "https://docs.sylph.ai/changelog/",
    },
  ],
};
