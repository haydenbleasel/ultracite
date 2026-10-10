import type { AgentPageContent } from "./types";

export const cline: AgentPageContent = {
  checked: { date: "2026-10-10", version: "4.1.23" },
  faqs: [
    {
      answer:
        "Yes, the one at your workspace root, plus a global `~/.agents/AGENTS.md`. It shows up in the Rules panel with its own toggle, so check it’s switched on.",
      question: "Does Cline read AGENTS.md?",
    },
    {
      answer:
        "No. Cline’s rule search includes only the workspace root’s `AGENTS.md`. For folder-specific guidance, add a `.clinerules/` file with `paths` globs instead.",
      question: "Does Cline read nested AGENTS.md files?",
    },
    {
      answer:
        "Yes. Scripts named after their event, such as `PostToolUse`, run from `.cline/hooks/` in the CLI and SDK; the VS Code extension reads extensionless scripts from `.clinerules/hooks/` once Enable Hooks is on in Cline’s feature settings. Ultracite doesn’t install one for Cline yet.",
      question: "Does Cline support hooks?",
    },
    {
      answer:
        "In Auto Approve, turn on Execute safe commands, and Execute all commands for anything the model flags. YOLO mode approves everything, destructive commands included, so keep it for throwaway work.",
      question: "How do I make Cline run the linter without asking?",
    },
    {
      answer:
        "Yes. `.clinerules/` and `.cline/rules/` are both read in VS Code, the desktop app and the CLI, and combined into one set with `AGENTS.md`.",
      question: "Does Cline still read .clinerules?",
    },
  ],
  headline: "Cline lists AGENTS.md as a rule you can toggle",
  highlights: [
    {
      body: "Cline has no fixed command allowlist: the model flags each command with `requires_approval`. Execute safe commands covers unflagged ones and Execute all commands covers the rest, so whether `ultracite fix` asks first depends on the model’s call.",
      title: "The model decides what’s safe",
    },
    {
      body: "The `cline` CLI’s `--auto-approve` flag defaults to `true`, and it runs headless when you pass `--json`, pipe stdin or redirect output. An unattended run edits files and runs commands without asking, so Cline’s docs suggest a clean branch.",
      title: "The CLI approves by default",
    },
    {
      body: "Rule files in `.clinerules/` can list `paths` globs and load only when matching files are in context: open tabs, paths you mention, files Cline edits. Ultracite’s rules apply everywhere, so they stay in `AGENTS.md`.",
      title: "Rules that wake up on file paths",
    },
  ],
  intro:
    "Cline reads Ultracite’s rules from the `AGENTS.md` at your workspace root and lists it in the Rules panel beside `.clinerules/`. Ultracite doesn’t add a Cline hook, so after editing, Cline runs the `ultracite fix` the rules ask for, and your auto-approve settings decide whether you’re asked first.",
  loop: {
    body: "Ultracite doesn’t install a Cline hook, so after an edit Cline runs the commands in `AGENTS.md`. Cline does run `PostToolUse` hook scripts, from `.cline/hooks/` in the CLI and `.clinerules/hooks/` in VS Code, but Ultracite doesn’t configure them yet.",
    steps: [
      "Cline edits a file; with Edit project files auto-approved, it doesn’t ask first.",
      "Following `AGENTS.md`, it proposes `npx ultracite fix`, and the model sets its `requires_approval` flag.",
      "If your auto-approve settings cover that flag, it runs; otherwise Cline asks you.",
      "Cline reads what’s left in the output and fixes it.",
    ],
    title: "Cline runs the fix the rules ask for",
  },
  metaDescription:
    "Set up Ultracite for Cline: rules in the root AGENTS.md, shown in the Rules panel with a toggle, and how auto-approve and hook scripts affect linting.",
  metaTitle: "Ultracite for Cline — AGENTS.md rules, toggles and hooks",
  related: ["kilo-code", "copilot", "augmentcode"],
  rules: {
    facts: [
      {
        label: "Toggles",
        value:
          "Every detected rule, `AGENTS.md` included, has an on and off switch in the Rules panel.",
      },
      {
        label: "Conditional rules",
        value:
          "`paths` globs in a rule’s front matter scope it to matching files; `paths: []` turns it off.",
      },
      {
        label: "Broken front matter",
        value:
          "Cline fails open: a rule whose YAML won’t parse still loads, raw.",
      },
      {
        label: "Both layouts",
        value:
          "`.clinerules/` and `.cline/rules/` are both read; the VS Code panel creates new rules in `.clinerules/`.",
      },
      {
        label: "Global rules",
        value:
          "`~/Documents/Cline/Rules`, plus `~/.cline/rules` and `~/Cline/Rules`. Workspace rules win on conflicts.",
      },
      {
        label: "Context cost",
        value:
          "Rules without `paths` load for every request, so keep them short.",
      },
    ],
    lookup: [
      {
        note: "At the workspace root only; Cline doesn’t look for nested ones.",
        path: "AGENTS.md",
      },
      {
        note: "Every Markdown file in either folder, combined into one set.",
        path: ".clinerules/ and .cline/rules/",
      },
      {
        note: "Other tools’ rules files, detected and listed with the rest.",
        path: ".cursorrules and .windsurfrules",
      },
      {
        note: "A cross-tool global instructions file, read in every workspace.",
        path: "~/.agents/AGENTS.md",
      },
      {
        note: "Your global Cline rules. Workspace rules win when they conflict.",
        path: "~/Documents/Cline/Rules",
      },
    ],
    summary:
      "Cline combines every rule source it finds into one set: the root `AGENTS.md`, `.clinerules/` and `.cline/rules/`, other tools’ rules files and your global rules. Workspace rules win over global ones when they conflict.",
  },
  skills:
    "Cline loads skills from `.agents/skills/`, as well as `.cline/skills/`, `.clinerules/skills/` and `.claude/skills/`, so it finds the Ultracite skill `init` installs. `cline config` lists the skills it found.",
  sources: [
    {
      title: "Cline: Rules",
      url: "https://docs.cline.bot/customization/cline-rules",
    },
    {
      title: "Cline: Config",
      url: "https://docs.cline.bot/getting-started/config",
    },
    {
      title: "Cline: Auto Approve & YOLO Mode",
      url: "https://docs.cline.bot/features/auto-approve",
    },
    {
      title: "Cline: CLI Overview",
      url: "https://docs.cline.bot/usage/cli-overview",
    },
    {
      title: "Cline source: hook examples",
      url: "https://github.com/cline/cline/blob/main/sdk/examples/hooks/README.md",
    },
    {
      title: "Cline source: config search paths",
      url: "https://github.com/cline/cline/blob/main/sdk/packages/shared/src/storage/paths.ts",
    },
  ],
};
