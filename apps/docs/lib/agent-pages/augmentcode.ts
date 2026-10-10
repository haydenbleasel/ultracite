import type { AgentPageContent } from "./types";

export const augmentcode: AgentPageContent = {
  checked: { date: "2026-10-10", product: "Auggie CLI", version: "0.36.0" },
  faqs: [
    {
      answer:
        "Yes, in the VS Code and JetBrains extensions and in the Auggie CLI. The workspace-root file is always included, and an `AGENTS.md` in a subfolder joins when Augment works on files under it.",
      question: "Does Augment Code read AGENTS.md?",
    },
    {
      answer:
        "Yes. Auggie lists `CLAUDE.md` just ahead of `AGENTS.md`, and both are discovered in subfolders. If you keep both, make sure they agree on how the project lints and formats.",
      question: "Does Augment read CLAUDE.md as well?",
    },
    {
      answer:
        "Run `auggie rules list` in the workspace. It prints the rules and guidelines Auggie detected there.",
      question: "How do I see which rules Auggie loaded?",
    },
    {
      answer:
        "Auggie does: `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart` and `SessionEnd`, configured in `settings.json`. A workspace’s `.augment/settings.json` is read by the CLI only; the IDE extensions read `~/.augment/settings.json` and the system file. Ultracite doesn’t configure Augment hooks.",
      question: "Does Augment support hooks?",
    },
    {
      answer:
        "It’s probably a Manual rule. Auggie skips `type: manual` rules because the CLI has no @-mention to attach them; switch the rule to `always_apply` or `agent_requested`.",
      question: "Why does a rule work in the IDE but not in Auggie?",
    },
  ],
  headline: "Augment reads every AGENTS.md on a file’s path",
  highlights: [
    {
      body: "`toolPermissions` in `.augment/settings.json` are honored by Auggie and by Cosmos cloud agents, though not by the IDE extensions. A `terminal` rule with `shellInputRegex` allows or denies commands by pattern, and when policies disagree, the most restrictive rule wins.",
      title: "Permissions that apply in the cloud too",
    },
    {
      body: "`auggie --print` runs one instruction and exits, `--output-format json` returns structured output and `--max-turns` caps the run, so a CI job can ask Auggie to fix what `ultracite check` reports.",
      title: "Auggie runs headless",
    },
    {
      body: "Set a rule in `.augment/rules/` to `agent_requested` with a `description`, and Augment attaches it only when it judges the rule relevant, which saves context. Ultracite’s rules stay in `AGENTS.md`, which is always included.",
      title: "Scope the rest of your rules",
    },
  ],
  intro:
    "Augment Code reads Ultracite’s rules from the workspace-root `AGENTS.md` in its VS Code and JetBrains extensions and in the Auggie CLI, and adds any `AGENTS.md` between an edited file and the root. Ultracite doesn’t set up a hook for it, so Augment runs `ultracite fix` and `ultracite check` when the rules tell it to.",
  loop: {
    body: "Ultracite doesn’t configure a hook for Augment, so after an edit Augment runs `ultracite fix` when `AGENTS.md` tells it to. Auggie does have a `PostToolUse` event that receives the changed files and can return `additionalContext` to the agent, but it can’t block, each hook command must be a `.sh`, `.ps1`, `.cmd` or `.bat` script, and a workspace’s `.augment/settings.json` is read by the CLI only.",
    steps: [
      "Augment edits or creates a file.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` in its terminal.",
      "It reads what’s left in the output and fixes it before it finishes.",
    ],
    title: "AGENTS.md drives it; hooks are up to you",
  },
  metaDescription:
    "Set up Ultracite for Augment Code and the Auggie CLI: rules in AGENTS.md, nested files per folder, rule types, and what Auggie’s PostToolUse hooks can do.",
  metaTitle: "Ultracite for Augment Code — AGENTS.md, nested rules and Auggie",
  related: ["zencoder", "junie", "cline"],
  rules: {
    facts: [
      {
        label: "Nested files",
        value:
          "Only `AGENTS.md` and `CLAUDE.md` load from subfolders, from the edited file’s folder up to the workspace root. Files in sibling folders stay out.",
      },
      {
        label: "Manual rules",
        value:
          "Auggie skips `type: manual` rules, since the CLI has no @-mention to attach them. Only the IDE does.",
      },
      {
        label: "User guidelines",
        value:
          "In VS Code they live in `~/.augment/user-guidelines.md`. Guidelines set in VS Code don’t carry over to JetBrains IDEs, or the other way round.",
      },
      {
        label: "Size",
        value:
          "In the IDE, workspace guidelines and rules share a 49,512-character limit; user guidelines get 24,576.",
      },
      {
        label: "Check it",
        value:
          "`auggie rules list` prints the rules and guidelines Auggie found in the workspace.",
      },
      {
        label: "Duplicates",
        value:
          "Rules are cached per conversation, so a file Augment finds twice isn’t included twice.",
      },
    ],
    lookup: [
      {
        note: "Auggie only: a file passed with `--rules`, appended to the workspace guidelines.",
        path: "--rules <file>",
      },
      {
        note: "Read for compatibility with Claude Code, and found in subfolders the same way as `AGENTS.md`.",
        path: "CLAUDE.md",
      },
      {
        note: "The workspace-root file `init` writes, included in every prompt.",
        path: "AGENTS.md",
      },
      {
        note: "Workspace guidelines at the root. The IDE imports them as rules.",
        path: ".augment-guidelines",
      },
      {
        note: "Workspace rules, searched recursively at the root only. Frontmatter decides whether each always applies or is attached when relevant.",
        path: ".augment/rules/",
      },
      {
        note: "Your rules for every workspace, always applied whatever their frontmatter says.",
        path: "~/.augment/rules/",
      },
    ],
    summary:
      "The extensions and Auggie share one rules system. The root `AGENTS.md` sits in a list with `CLAUDE.md`, `.augment-guidelines` and `.augment/rules/`, and nested `AGENTS.md` files join when Augment works in their folders.",
  },
  skills:
    "Augment loads skills from `.augment/skills/`, `.claude/skills/` and `.agents/skills/`, in the workspace or your home folder, so it finds the Ultracite skill `init` installs in `.agents/skills/` (and in `.augment/skills/` when the project has a `.augment` folder). `/skills` in Auggie lists what loaded.",
  sources: [
    {
      title: "Augment: Rules & Guidelines (Auggie CLI)",
      url: "https://docs.augmentcode.com/cli/rules",
    },
    {
      title: "Augment: Rules & Guidelines for Agent and Chat",
      url: "https://docs.augmentcode.com/setup-augment/guidelines",
    },
    {
      title: "Augment: Hooks",
      url: "https://docs.augmentcode.com/cli/hooks",
    },
    {
      title: "Augment: Tool Permissions",
      url: "https://docs.augmentcode.com/cli/permissions",
    },
    {
      title: "Augment: Agent Skills",
      url: "https://docs.augmentcode.com/cli/skills",
    },
    {
      title: "Augment: CLI Flags and Options",
      url: "https://docs.augmentcode.com/cli/reference",
    },
  ],
};
