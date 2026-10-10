import type { AgentPageContent } from "./types";

export const qoder: AgentPageContent = {
  checked: { date: "2026-10-10", product: "Qoder CLI", version: "1.1.68" },
  faqs: [
    {
      answer:
        "Yes. Qoder IDE uses a project `AGENTS.md` with no setup, and in Qoder CLI it’s the default context file, read from `~/.qoder/`, the project and its parent folders up to the git root.",
      question: "Does Qoder read AGENTS.md?",
    },
    {
      answer:
        "In Qoder IDE, the rules. Keep Ultracite’s rules in `AGENTS.md` and avoid rules in `.qoder/rules/` that contradict them.",
      question: "What wins when AGENTS.md and .qoder/rules disagree?",
    },
    {
      answer:
        "Run `/memory`. It lists the user, project and local memory files Qoder CLI loaded. If `AGENTS.md` is missing, make sure the directory is trusted and that `agentsMdExcludes` doesn’t exclude it.",
      question: "How do I check Qoder CLI loaded the rules?",
    },
    {
      answer:
        "Yes. Qoder CLI, Qoder IDE and the JetBrains plugin read hooks from `~/.qoder/settings.json`, `.qoder/settings.json` and `.qoder/settings.local.json`; the IDE and plugin run 12 of the CLI’s events and need a restart after you edit them. Ultracite doesn’t configure Qoder hooks.",
      question: "Does Qoder support hooks?",
    },
    {
      answer:
        "Add `Bash(npx ultracite:*)` to `permissions.allow` in `.qoder/settings.json`, or run `/allow Bash(npx ultracite:*)` in a session, which saves the rule to `.qoder/settings.local.json`.",
      question: "How do I let Qoder CLI run ultracite without asking?",
    },
  ],
  headline: "Qoder reads AGENTS.md alongside .qoder/rules",
  highlights: [
    {
      body: "A Qoder CLI hook with `asyncRewake: true` runs in the background. If it exits with code 2, Qoder turns its output into a system reminder and wakes the model; the docs suggest it for long-running checks.",
      title: "A hook can wake the model later",
    },
    {
      body: "`qoder -p` runs one prompt without the TUI. Pair it with `--permission-mode accept_edits` or `--allowed-tools 'Bash(npx ultracite:*)'` to decide what it may run in CI.",
      title: "Headless, with set permissions",
    },
    {
      body: "A rule in `.qoder/rules/` with `trigger: glob` or `paths` loads only when Qoder CLI reads a matching file, and a `model_decision` rule adds just its description until the model asks for the body.",
      title: "Rules that load per file",
    },
  ],
  intro:
    "Qoder IDE and Qoder CLI both read Ultracite’s rules from `AGENTS.md`, alongside any rules in `.qoder/rules/`; in the IDE, those rules win when the two conflict. Ultracite doesn’t set up a hook for Qoder, so it runs `ultracite fix` and `ultracite check` when the rules tell it to.",
  loop: {
    body: "Ultracite doesn’t configure a hook for Qoder, so after an edit Qoder runs `ultracite fix` when `AGENTS.md` tells it to. Qoder CLI and Qoder IDE do share hooks in `.qoder/settings.json`, and the docs show an auto-lint `PostToolUse` hook on `Write|Edit`; a `PostToolUse` hook can’t block, but it can pass the model `additionalContext`. A permission rule lets Qoder CLI run `ultracite` without asking.",
    snippets: [
      {
        code: `{
  "permissions": {
    "allow": ["Bash(npx ultracite:*)"]
  }
}`,
        lang: "json",
        title: ".qoder/settings.json",
      },
    ],
    steps: [
      "Qoder edits a file with its `Write` or `Edit` tool.",
      "Following `AGENTS.md`, it runs `npx ultracite fix`, asking first unless a permission rule allows it.",
      "It reads the output and fixes what autofix left.",
    ],
    title: "Qoder runs the fix the rules ask for",
  },
  metaDescription:
    "Set up Ultracite for Qoder: rules in AGENTS.md for Qoder IDE and Qoder CLI, how they mix with .qoder/rules, and a permission rule so ultracite runs unprompted.",
  metaTitle: "Ultracite for Qoder — AGENTS.md in Qoder IDE and Qoder CLI",
  related: ["qwen", "kiro-cli", "augmentcode"],
  rules: {
    facts: [
      {
        label: "Check it",
        value:
          "`/memory` in Qoder CLI lists every memory file it loaded, including ones it picked up on demand.",
      },
      {
        label: "Trust",
        value:
          "In an untrusted directory, Qoder CLI loads no project settings, hooks, MCP servers or `AGENTS.md`.",
      },
      {
        label: "File names",
        value:
          "`context.fileName` sets another file name or a list of them (the default is `AGENTS.md`), and `agentsMdExcludes` excludes files.",
      },
      {
        label: "Imports",
        value:
          "`@path` in `AGENTS.md` imports another file, relative to that `AGENTS.md`. Paths outside the project need approval.",
      },
      {
        label: "IDE limit",
        value:
          "Qoder IDE caps all active rule files at 100,000 characters in total and truncates the rest.",
      },
      {
        label: "Live edits",
        value:
          "Qoder CLI watches loaded rule files and picks up edits on the next turn, with no restart.",
      },
    ],
    lookup: [
      {
        note: "Qoder CLI’s user level: your own `AGENTS.md` and `rules/` for every project.",
        path: "~/.qoder/",
      },
      {
        note: "The project’s file, which `init` writes. Qoder CLI searches up from the working directory to the folder that holds `.git`.",
        path: "AGENTS.md",
      },
      {
        note: "Machine-only additions next to `AGENTS.md`, not meant to be committed.",
        path: "AGENTS.local.md",
      },
      {
        note: "Project rules. Always-on ones load with `AGENTS.md`, file-scoped ones when Qoder reads a matching file. In Qoder IDE they win over `AGENTS.md` on conflicts.",
        path: ".qoder/rules/",
      },
      {
        note: "A nested `AGENTS.md` or `.qoder/rules/` loads in Qoder CLI once it reads a file below it.",
        path: "Subdirectories",
      },
    ],
    summary:
      "Qoder CLI rebuilds its context each session from `AGENTS.md` files and `.qoder/rules/`, searching up from the working directory to the folder that holds `.git`. Qoder IDE picks up the project’s `AGENTS.md` with no setup.",
  },
  skills:
    "Qoder loads skills from `.qoder/skills/` and `~/.qoder/skills/`. Its docs don’t list `.agents/skills/`, where `init` installs the Ultracite skill, so add it for Qoder with `npx skills add haydenbleasel/ultracite -a qoder`.",
  sources: [
    {
      title: "Qoder CLI: Memory",
      url: "https://docs.qoder.com/cli/memory",
    },
    {
      title: "Qoder: Rules",
      url: "https://docs.qoder.com/user-guide/rules",
    },
    {
      title: "Qoder CLI: Hooks",
      url: "https://docs.qoder.com/cli/hooks",
    },
    {
      title: "Qoder: Hooks for the IDE and JetBrains plugin",
      url: "https://docs.qoder.com/extensions/hooks",
    },
    {
      title: "Qoder CLI: Permissions",
      url: "https://docs.qoder.com/cli/permissions",
    },
    {
      title: "Qoder CLI: Skills",
      url: "https://docs.qoder.com/cli/Skills",
    },
  ],
};
