import type { AgentPageContent } from "./types";

export const firebender: AgentPageContent = {
  checked: { date: "2026-10-10", version: "1.0.12" },
  faqs: [
    {
      answer:
        "Yes. It uses the first of `.firebender/AGENTS.md` or `AGENTS.md` in the project root, then in parent directories, then `~/.firebender/AGENTS.md`, and applies it to every conversation with no `firebender.json` setup.",
      question: "Does Firebender read AGENTS.md?",
    },
    {
      answer:
        "Check for a `.firebender/AGENTS.md`. Firebender uses only the first file it finds, and that one is checked first, so merge the two into one file that includes Ultracite’s rules.",
      question: "Why does Firebender ignore my root AGENTS.md?",
    },
    {
      answer:
        "Yes, in `.firebender/hooks.json` or `~/.firebender/hooks.json`, with events such as `afterFileEdit`, `postToolUse` and `stop`; exit code 2 blocks an action. Ultracite doesn’t configure Firebender hooks.",
      question: "Does Firebender support hooks?",
    },
    {
      answer:
        "Run `init` again. Earlier versions wrote the rules to `.firebender/rules/ultracite.mdc`, and before that into `firebender.json`; `init` now takes them out of both, deletes a file that held nothing else, and keeps the rules in `AGENTS.md`.",
      question:
        "I set Ultracite up for Firebender before. Do I need to do anything?",
    },
  ],
  headline: "Firebender reads the first AGENTS.md it finds",
  highlights: [
    {
      body: "In worktree mode each agent works in its own Git worktree. When it’s done, Review opens IntelliJ’s diff viewer, where you can run your run configurations against the worktree before you create a PR.",
      title: "Worktrees with a review panel",
    },
    {
      body: "Firebender’s `stop` hook can return a `followup_message`, which it submits as the next user message, up to 5 times in a conversation. It’s the documented way for a script to send results back once the agent finishes; Ultracite doesn’t set one up.",
      title: "A stop hook can send a follow-up",
    },
    {
      body: "Rules in `.firebender/rules/` apply to every Firebender feature, including autocomplete, chat and inline edits, not only the agent.",
      title: "Rules reach autocomplete too",
    },
  ],
  intro:
    "Firebender reads Ultracite’s rules from the project-root `AGENTS.md` in every conversation, unless a `.firebender/AGENTS.md` comes first, and applies `.firebender/rules/` alongside it. Ultracite doesn’t set up a hook for Firebender, so it runs `ultracite fix` and `ultracite check` when the rules tell it to.",
  loop: {
    body: "Ultracite doesn’t configure a hook for Firebender, so the loop is the one `AGENTS.md` describes: edit, then `ultracite fix`. Firebender does have an `afterFileEdit` hook in `.firebender/hooks.json` that gets the edited file’s path and is meant for formatters, but its docs define no output that reaches the agent.",
    steps: [
      "Firebender’s agent edits a file.",
      "The rules in `AGENTS.md` tell it to run `npx ultracite fix`, which it does in an agent terminal.",
      "It reads the output and fixes what autofix couldn’t.",
    ],
    title: "Firebender runs the checks AGENTS.md names",
  },
  metaDescription:
    "Set up Ultracite for Firebender in Android Studio and JetBrains IDEs: rules in AGENTS.md, why .firebender/AGENTS.md wins, and what its hooks can do.",
  metaTitle: "Ultracite for Firebender — AGENTS.md in Android Studio",
  related: ["junie", "augmentcode", "zencoder"],
  rules: {
    facts: [
      {
        label: "One file",
        value:
          "Firebender uses the first `AGENTS.md` it finds. A personal `~/.firebender/AGENTS.md` is a fallback, not an addition.",
      },
      {
        label: "Live reload",
        value:
          "Firebender reloads `AGENTS.md` and rule files when you save them. `AGENTS.md` changes apply without a restart or a new chat.",
      },
      {
        label: "Rule files",
        value:
          "`.mdc` files in `.firebender/rules/`, plus personal ones in `~/.firebender/rules/`. `alwaysApply: true` applies a rule everywhere; `globs` limits it to matching files.",
      },
      {
        label: "Monorepos",
        value:
          "With no `AGENTS.md` in the project you opened, Firebender walks up the parent directories, so a subproject picks up the repository root’s file.",
      },
      {
        label: "Both at once",
        value:
          "`AGENTS.md` and rules complement each other: both apply to the conversations they match.",
      },
      {
        label: "Since",
        value:
          "Firebender added `AGENTS.md` support in 0.15.5, in January 2026.",
      },
    ],
    lookup: [
      {
        note: "A `.firebender/AGENTS.md` in the project root comes first. If it exists, it’s the one Firebender uses.",
        path: ".firebender/AGENTS.md",
      },
      {
        note: "The project-root file `init` writes, used when there’s no `.firebender/AGENTS.md`.",
        path: "AGENTS.md",
      },
      {
        note: "With neither in the project root, Firebender walks up for a `.firebender/AGENTS.md`, then walks up again for an `AGENTS.md`.",
        path: "Parent directories",
      },
      {
        note: "Your personal `AGENTS.md`, used only when no project file turns up.",
        path: "~/.firebender/AGENTS.md",
      },
      {
        note: "Project rules, applied alongside whichever `AGENTS.md` was found: always, or for files matching their `globs`.",
        path: ".firebender/rules/*.mdc",
      },
    ],
    summary:
      "Firebender uses a single `AGENTS.md`, the first it finds, and reloads it when you save. Rule files in `.firebender/rules/` add to it, either always or for matching files.",
  },
  skills:
    "Firebender loads skills from `.firebender/skills/` and also reads `.agents/skills/`, `.claude/skills/`, `.codex/skills/`, `.cursor/skills/` and `.goose/skills/` (and their `~/` versions), so it finds the Ultracite skill `init` installs in `.agents/skills/`.",
  sources: [
    {
      title: "Firebender: AGENTS.md",
      url: "https://docs.firebender.com/api-reference/agents-md",
    },
    {
      title: "Firebender: Rules",
      url: "https://docs.firebender.com/multi-agent/global-rules",
    },
    {
      title: "Firebender: Hooks",
      url: "https://docs.firebender.com/multi-agent/hooks",
    },
    {
      title: "Firebender: Skills reference",
      url: "https://docs.firebender.com/api-reference/skills",
    },
    {
      title: "Firebender: Worktrees",
      url: "https://docs.firebender.com/multi-agent/worktrees",
    },
    {
      title: "Firebender: Changelog",
      url: "https://docs.firebender.com/about/changelog",
    },
  ],
};
