import type { AgentPageContent } from "./types";

export const fx: AgentPageContent = {
  checked: { date: "2026-10-10", version: "0.0.13" },
  faqs: [
    {
      answer:
        "Yes. fx loads `AGENTS.md` from the folder you start it in, from parent folders up to your home directory, from `~/.fx/AGENTS.md`, and from a nested folder when it works on a file there.",
      question: "Does fx read AGENTS.md?",
    },
    {
      answer:
        "No. fx looks only for files named `AGENTS.md`, so a project that keeps its rules in `CLAUDE.md` needs them in `AGENTS.md` for fx. `ultracite init` writes them there.",
      question: "Does fx read CLAUDE.md?",
    },
    {
      answer:
        'Add a `bash` rule such as `"npx ultracite *": "allow"` under `permission` in `~/.fx/settings.json`, globally or for one workspace. Project `.fx.json` files can’t define permission rules, so a repository can’t approve its own commands.',
      question: "How do I let fx run Ultracite without asking?",
    },
    {
      answer:
        'Look for `"context": false` in `.fx.json` or your profile, a file over the 64 KiB per-file or 128 KiB combined limit, or a folder added as an additional directory, which never contributes instructions.',
      question: "Why is fx ignoring my AGENTS.md?",
    },
    {
      answer:
        "fx’s docs describe no hooks that run after an edit. Ultracite’s rules in `AGENTS.md` are what tell it to run `ultracite fix`.",
      question: "Does fx support hooks?",
    },
  ],
  headline: "fx reads AGENTS.md and runs lint in your shell",
  highlights: [
    {
      body: "fx loads your shell startup files once per process and reuses them for every command it runs, so commands behave as they do in your terminal. After you change those files, `/shell reload` refreshes them and clears remembered command approvals.",
      title: "Your shell, loaded once",
    },
    {
      body: "The default `auto` mode runs reads, edits and recognized project commands directly, and sends unrecognized shell commands to a review model that checks for prompt injection. Actions your rules allow or deny skip the review, which also saves the tokens it costs.",
      title: "Auto mode reviews unfamiliar commands",
    },
    {
      body: "In saved conversations, fx stores large tool results separately and gives the model a preview and a handle. With `read_tool_result`, the agent can search a long lint report or read part of it later, even after you resume.",
      title: "Long lint output stays searchable",
    },
  ],
  intro:
    "fx reads `AGENTS.md` from the folder you start it in and the folders above it, plus any nested `AGENTS.md` next to the files it works on. It has no post-edit hooks, so Ultracite’s rules are what get it to run `ultracite fix` through its `shell` tool.",
  loop: {
    body: "fx runs `ultracite fix` because `AGENTS.md` tells it to. In the default `auto` mode, fx runs recognized project commands directly and sends other commands to a review model first; an allow rule in `~/.fx/settings.json` lets the command through without a review.",
    snippets: [
      {
        code: '{\n  "permission": {\n    "bash": {\n      "npx ultracite *": "allow"\n    }\n  }\n}',
        lang: "json",
        title: "~/.fx/settings.json",
      },
    ],
    steps: [
      "fx changes a file with `edit_file` or `write_file`.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` with its `shell` tool, using your shell startup files.",
      "In `auto` mode the command runs directly or goes to the review model first; a matching allow rule skips the review.",
      "fx reads the output and fixes what’s left. A long result is stored, and fx can search it with `read_tool_result`.",
    ],
    title: "No hooks: the rules run the linter",
  },
  metaDescription:
    "Set up Ultracite for fx, the Vercel Labs coding agent: rules in AGENTS.md, a permission rule for npx ultracite, and the size limits fx puts on instructions.",
  metaTitle: "Ultracite for fx — Rules from AGENTS.md, run in your shell",
  related: ["pi", "crush", "codex"],
  rules: {
    facts: [
      {
        label: "One file name",
        value:
          "fx doesn’t fall back to `CLAUDE.md` or any other name. Every instructions file it reads is an `AGENTS.md`.",
      },
      {
        label: "Size",
        value:
          "64 KiB per file and 128 KiB in total by default. Ultracite’s rules take about 5 KB.",
      },
      {
        label: "Raise the limits",
        value:
          "Set `context_limits` in `~/.fx/settings.json`, or pass `--context-limit` for one run. Project `.fx.json` can’t change them.",
      },
      {
        label: "Turn it off",
        value:
          '`"context": false` in `.fx.json` or your profile stops fx loading every `AGENTS.md`, your personal one included.',
      },
      {
        label: "Extra folders",
        value:
          "Additional directories give fx access to their files but don’t load their `AGENTS.md`.",
      },
      {
        label: "Check it",
        value:
          "When a file is shortened or left out, press `ctrl+o` and Full detail shows the limit notice.",
      },
    ],
    lookup: [
      {
        note: "Your instructions for every project.",
        path: "~/.fx/AGENTS.md",
      },
      {
        note: "Read up to, but not including, your home directory, for projects that live under it.",
        path: "Parent folders’ AGENTS.md",
      },
      {
        note: "The project’s instructions, from the folder where you start fx.",
        path: "AGENTS.md",
      },
      {
        note: "Loaded alongside the root file when fx works on a file in that folder. The closest file wins a conflict.",
        path: "apps/web/AGENTS.md",
      },
    ],
    summary:
      "fx looks only for files named `AGENTS.md`. It loads your personal one, the ones above your project, the project’s own, and a nested one when it works on a file below it; your prompts take priority over all of them.",
  },
  skills:
    "fx checks `.fx/skills/`, `skills/`, `.agents/skills/`, `.claude/skills/` and other compatible folders from the workspace upward, so it finds the Ultracite skill `init` installs in `.agents/skills/`. Type `$ultracite` to add it to a prompt.",
  sources: [
    {
      title: "fx: Project instructions",
      url: "https://fx.sh/docs/configure-fx/project-instructions",
    },
    {
      title: "fx: Context limits",
      url: "https://fx.sh/docs/configure-fx/context-limits",
    },
    {
      title: "fx: Permissions",
      url: "https://fx.sh/docs/configure-fx/permissions",
    },
    {
      title: "fx: Skills",
      url: "https://fx.sh/docs/capabilities/skills",
    },
    {
      title: "fx: Tools",
      url: "https://fx.sh/docs/capabilities/tools",
    },
    {
      title: "fx source: instruction loading (src/builtins/context.zig)",
      url: "https://github.com/vercel-labs/fx/blob/main/src/builtins/context.zig",
    },
  ],
};
