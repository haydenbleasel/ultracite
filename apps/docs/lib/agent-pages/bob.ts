import type { AgentPageContent } from "./types";

export const bob: AgentPageContent = {
  checked: { date: "2026-10-10", version: "2.2.1" },
  faqs: [
    {
      answer:
        "Yes, by default, from the workspace root, in both Bob IDE and Bob Shell. It loads after the current mode’s rules and before the general rules in `.bob/rules/`.",
      question: "Does IBM Bob read AGENTS.md?",
    },
    {
      answer:
        "Check that `bob-code.useAgentRules` (Bob IDE) or `bob-shell.useAgentRules` (Bob Shell) isn’t set to `false`, and look in `.bob/rules/` and `~/.bob/rules/` for a rule that says something different, since Bob reads them all.",
      question: "Why isn’t Bob following the Ultracite rules?",
    },
    {
      answer:
        "Yes: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse` and `Stop`. Only `UserPromptSubmit` and `PreToolUse` can block (with exit code 2), and `PostToolUse` output is ignored. Ultracite doesn’t configure Bob hooks.",
      question: "Does IBM Bob support hooks?",
    },
    {
      answer:
        "Add `npx ultracite` to `approvedCommands` for `execute_command` under `approval.allowedExecutors` in `~/.bob/settings/settings.json`. Commands that start with an approved entry are approved automatically, and the file is shared by Bob IDE and Bob Shell.",
      question: "How do I let Bob run ultracite without asking?",
    },
  ],
  headline: "IBM Bob reads AGENTS.md unless you switch it off",
  highlights: [
    {
      body: "In Bob IDE, `@terminal` adds your last terminal command and its output to the chat, and `@problems` adds every error and warning in the Problems panel, with file paths and line numbers.",
      title: "Hand it the output with @terminal",
    },
    {
      body: "`approvedCommands` under `approval.allowedExecutors` in `~/.bob/settings/settings.json` approves commands that start with an entry, such as `npx ultracite`, and `deniedCommands` always win. Bob Shell picks up changes at the start of its next session.",
      title: "Allowlist commands by prefix",
    },
    {
      body: "Each mode reads its own `.bob/rules-{mode}/` folder, such as `rules-plan/` or `rules-ask/`, so Plan mode can carry instructions that Ask mode never sees.",
      title: "Rules per mode",
    },
  ],
  intro:
    "IBM Bob loads Ultracite’s rules from the workspace-root `AGENTS.md` by default, in Bob IDE and Bob Shell, between the current mode’s rules and the general ones. Its `PostToolUse` hook ignores output, so nothing reports back after an edit; Bob runs `ultracite fix` and `ultracite check` when the rules tell it to.",
  loop: {
    body: "Bob IDE and Bob Shell run lifecycle hooks from `~/.bob/settings/settings.json` and `.bob/settings.json`, and `PostToolUse` fires after a matched tool such as `write_file`. Its stdout is ignored and exit code 2 does nothing, so a lint hook there couldn’t tell Bob what failed, and Ultracite doesn’t set one up. Bob runs `ultracite fix` and `ultracite check` because `AGENTS.md` tells it to.",
    steps: [
      "Bob writes a file, for example with its `write_file` tool.",
      "The rules in `AGENTS.md` tell it to run `npx ultracite fix`, which it does once the command is approved.",
      "It reads the output and fixes what’s left.",
      "If you ran `npx ultracite check` yourself, `@terminal` hands Bob the command and its output.",
    ],
    title: "Bob’s PostToolUse hook can’t report back",
  },
  metaDescription:
    "Set up Ultracite for IBM Bob: rules in AGENTS.md for Bob IDE and Bob Shell, where they load among .bob/rules, and why Bob’s PostToolUse hook can’t report back.",
  metaTitle: "Ultracite for IBM Bob — AGENTS.md in Bob IDE and Bob Shell",
  related: ["cline", "kilo-code", "qoder"],
  rules: {
    facts: [
      {
        label: "Switch it off",
        value:
          '`"bob-code.useAgentRules": false` in Bob IDE settings, or `"bob-shell.useAgentRules": false` in Bob Shell, stops Bob reading `AGENTS.md`. Leave both unset for Ultracite.',
      },
      {
        label: "Bob Shell files",
        value:
          "Bob Shell also reads single files at the workspace root: `.bobrules` for every mode and `.bobrules-{mode}` for one.",
      },
      {
        label: "Overrides",
        value:
          "Workspace rules can override global rules when the two disagree.",
      },
      {
        label: "File handling",
        value:
          "Rules folders are read recursively, in alphabetical order. Empty files and cache files such as `.DS_Store` are skipped, and symlinks are followed up to 5 levels deep.",
      },
      {
        label: "Mode instructions",
        value:
          "A mode’s custom instructions, set under Modes in the Bob sidebar, combine with the files in its `rules-{mode}/` folder.",
      },
      {
        label: "Shared settings",
        value:
          "Bob IDE and Bob Shell share `~/.bob/settings/settings.json`, so approvals set in the IDE’s settings land in the same file Bob Shell reads.",
      },
    ],
    lookup: [
      {
        note: "Your global rules for every project, loaded first.",
        path: "~/.bob/rules/",
      },
      {
        note: "Workspace rules for the current mode, such as `rules-plan/` or `rules-ask/`.",
        path: ".bob/rules-{mode}/",
      },
      {
        note: "The workspace-root file `init` writes, loaded by default after the mode’s rules.",
        path: "AGENTS.md",
      },
      {
        note: "General workspace rules, loaded last. They can override global rules.",
        path: ".bob/rules/",
      },
    ],
    summary:
      "Bob combines global rules first, then workspace rules, and loads `AGENTS.md` after the current mode’s rules but before the general rules in `.bob/rules/`.",
  },
  skills:
    "Bob loads skills from `.bob/skills/` and `~/.bob/skills/`, not from `.agents/skills/`, and asks before activating one unless Skills is auto-approved. When you choose Bob, `init` installs the Ultracite skill into `.bob/skills/` as well.",
  sources: [
    {
      title: "IBM Bob: Custom rules",
      url: "https://bob.ibm.com/docs/ide/configuration/rules",
    },
    {
      title: "IBM Bob: Custom rules (Bob Shell)",
      url: "https://bob.ibm.com/docs/shell/configuration/bobshell-custom-rules",
    },
    {
      title: "IBM Bob: Lifecycle hooks",
      url: "https://bob.ibm.com/docs/ide/configuration/lifecycle-hooks",
    },
    {
      title: "IBM Bob: Approval settings (Bob Shell)",
      url: "https://bob.ibm.com/docs/shell/configuration/approval-settings",
    },
    {
      title: "IBM Bob: Context mentions",
      url: "https://bob.ibm.com/docs/ide/features/context-mentions",
    },
    {
      title: "IBM Bob: Skills",
      url: "https://bob.ibm.com/docs/ide/features/skills",
    },
  ],
};
